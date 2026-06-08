import frappe
from frappe import _
import json
import hashlib
import hmac
import os
import urllib.parse
from datetime import datetime

AI_TRIAL_MESSAGE_LIMIT = 10

def _has_user_field(fieldname):
    return any(df.fieldname == fieldname for df in frappe.get_meta("User").fields)

def _has_doctype_field(doctype, fieldname):
    return any(df.fieldname == fieldname for df in frappe.get_meta(doctype).fields)

def _get_ai_access(user):
    user_doc = frappe.get_doc("User", user)
    expiration_date = user_doc.get("custom_ai_expiration_date")
    from frappe.utils import getdate, today
    
    is_active_sub = bool(expiration_date and getdate(expiration_date) >= getdate(today()))
    
    package_type = "Normal"
    if is_active_sub:
        latest_order = frappe.get_all(
            "FC AI Subscription Order",
            filters={"teacher": user, "status": ["in", ["Paid", "Approved"]], "package_type": ["not like", "Custom_%"]},
            fields=["package_type"],
            order_by="payment_date desc, creation desc",
            limit=1
        )
        if latest_order:
            package_type = "Pro" if "Pro" in latest_order[0].package_type else "Normal"
            
    base_limit = 0
    start_date = None
    if is_active_sub:
        base_limit = 120000 if package_type == "Pro" else 50000
        start_date = get_subscription_start_date(user)
        
    total_custom_tokens = 0
    orders = frappe.db.sql("""
        SELECT package_type FROM `tabFC AI Subscription Order`
        WHERE teacher = %s AND status = 'Paid' AND package_type LIKE %s
    """, (user, 'Custom_%'), as_dict=True)
    for o in orders:
        try:
            total_custom_tokens += int(o.package_type.split("_")[1])
        except:
            pass
            
    token_limit = base_limit + total_custom_tokens
    used_tokens = get_user_token_usage(user, start_date)
    
    if used_tokens >= token_limit:
        return {
            "allowed": False,
            "is_subscribed": is_active_sub or total_custom_tokens > 0,
            "package_type": package_type if is_active_sub else "Custom",
            "token_limit": token_limit,
            "token_used": used_tokens,
            "code": "AI_TOKEN_LIMIT_EXHAUSTED",
            "message": f"Bạn đã sử dụng hết giới hạn token ({used_tokens}/{token_limit} tokens)."
        }
        
    if is_active_sub or total_custom_tokens > 0:
        return {
            "allowed": True,
            "is_subscribed": True,
            "package_type": package_type if is_active_sub else "Custom",
            "token_limit": token_limit,
            "token_used": used_tokens,
            "trial_used": 0,
            "trial_remaining": AI_TRIAL_MESSAGE_LIMIT
        }
    if not _has_user_field("custom_ai_trial_messages_used"):
        return {"allowed": False, "is_subscribed": False, "trial_used": AI_TRIAL_MESSAGE_LIMIT, "trial_remaining": 0}
    trial_used = int(user_doc.get("custom_ai_trial_messages_used") or 0)
    return {
        "allowed": trial_used < AI_TRIAL_MESSAGE_LIMIT,
        "is_subscribed": False,
        "trial_used": trial_used,
        "trial_remaining": max(AI_TRIAL_MESSAGE_LIMIT - trial_used, 0),
    }

def _consume_ai_trial_message(user):
    access = _get_ai_access(user)
    if access.get("is_subscribed") or not _has_user_field("custom_ai_trial_messages_used"):
        return
    user_doc = frappe.get_doc("User", user)
    trial_used = int(user_doc.get("custom_ai_trial_messages_used") or 0) + 1
    user_doc.db_set("custom_ai_trial_messages_used", trial_used)

def get_subscription_start_date(user):
    orders = frappe.get_all(
        "FC AI Subscription Order",
        filters={"teacher": user, "status": ["in", ["Paid", "Approved"]], "package_type": ["not like", "Custom_%"]},
        fields=["payment_date", "creation"],
        order_by="payment_date desc, creation desc",
        limit=1
    )
    if orders:
        return orders[0].payment_date or orders[0].creation
    return None

def get_user_token_usage(user, since_date=None):
    filters = {"user": user}
    if since_date:
        filters["creation"] = [">=", since_date]
    usages = frappe.get_all("FC AI Token Usage", filters=filters, fields=["input_tokens", "output_tokens"])
    total = sum((u.input_tokens or 0) + (u.output_tokens or 0) for u in usages)
    return total

def _get_vnpay_config():
    tmn_code = os.getenv("VNPAY_TMNCODE") or frappe.conf.get("VNPAY_TMNCODE") or ""
    hash_secret = os.getenv("VNPAY_HASHSECRET") or frappe.conf.get("VNPAY_HASHSECRET") or ""
    if not tmn_code or not hash_secret:
        frappe.throw("Chua cau hinh VNPAY trong file .env! Vui long kiem tra VNPAY_TMNCODE va VNPAY_HASHSECRET.")
    return {
        "tmn_code": tmn_code,
        "hash_secret": hash_secret,
        "pay_url": os.getenv("VNPAY_URL") or frappe.conf.get("VNPAY_URL") or "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        "return_url": os.getenv("VNPAY_RETURN_URL") or frappe.conf.get("VNPAY_RETURN_URL") or "http://localhost:5173/vnpay-return",
    }

def _vnpay_sign_data(params, quote_via=urllib.parse.quote_plus):
    clean_params = {
        key: str(value) for key, value in params.items()
        if key.startswith("vnp_")
        and key not in ("vnp_SecureHash", "vnp_SecureHashType")
        and value is not None
        and value != ""
    }
    return urllib.parse.urlencode(sorted(clean_params.items()), doseq=True, quote_via=quote_via)

def _vnpay_hash(params, hash_secret, quote_via=urllib.parse.quote_plus):
    sign_data = _vnpay_sign_data(params, quote_via=quote_via)
    return hmac.new(hash_secret.encode("utf-8"), sign_data.encode("utf-8"), hashlib.sha512).hexdigest()

def _activate_ai_subscription(order):
    if order.package_type.startswith("Custom_"):
        return

    teacher_user = frappe.get_doc("User", order.teacher)
    current_exp = teacher_user.get("custom_ai_expiration_date")
    from frappe.utils import add_days, getdate, today
    start_date = getdate(today())
    if current_exp and getdate(current_exp) > start_date:
        start_date = getdate(current_exp)
    days_to_add = 30 if order.package_type in ["Monthly", "Pro_Monthly"] else 365
    teacher_user.db_set("custom_ai_expiration_date", add_days(start_date, days_to_add))
    
    tier = "Pro" if "Pro" in order.package_type else "Normal"
    if _has_user_field("custom_ai_package_type"):
        teacher_user.db_set("custom_ai_package_type", tier)
        
    if _has_user_field("custom_ai_trial_messages_used"):
        teacher_user.db_set("custom_ai_trial_messages_used", 0)

@frappe.whitelist(allow_guest=True)
def get_my_classes():
    """
    Lấy danh sách lớp học theo Role.
    - Học sinh: Thấy lớp đã tham gia.
    - Giáo viên: Thấy lớp đã tạo.
    """
    user = frappe.session.user
    if user == 'Guest':
        frappe.throw(_("Please login first"), frappe.AuthenticationError)

    roles = frappe.get_roles(user)
    
    if "FC Teacher" in roles or "FC Admin" in roles:
        # Giáo viên lấy các lớp mà họ làm teacher
        classes = frappe.db.sql("""
            SELECT 
                c.name as class_id, c.class_name, c.class_code, c.status, c.price, c.image, c.max_students,
                (SELECT full_name FROM `tabUser` WHERE name = c.teacher) as teacher_name,
                (SELECT count(*) FROM `tabFC Class Member` WHERE parent = c.name) as student_count
            FROM `tabFC Class` c
            WHERE c.teacher = %s AND c.status = 'Active'
        """, (user,), as_dict=True)
    else:
        # Học sinh lấy các lớp họ đã join
        classes = frappe.db.sql("""
            SELECT 
                c.name as class_id, c.class_name, c.class_code, c.status, c.price, c.image, c.max_students,
                (SELECT full_name FROM `tabUser` WHERE name = c.teacher) as teacher_name,
                (SELECT count(*) FROM `tabFC Class Member` WHERE parent = c.name) as student_count
            FROM `tabFC Class` c
            INNER JOIN `tabFC Class Member` cs ON cs.parent = c.name
            WHERE cs.student = %s AND c.status = 'Active'
        """, (user,), as_dict=True)

    return {"classes": classes}

@frappe.whitelist()
def create_class(class_name, class_code, price=0, description="", max_students=50, image=None):
    """
    Cho phép Giáo viên tạo lớp mới (chỉ khi hồ sơ đã duyệt).
    """
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    if "FC Teacher" not in roles and "FC Admin" not in roles:
        frappe.throw(_("Bạn không có quyền tạo lớp học!"))
        
    doc = frappe.get_doc({
        "doctype": "FC Class",
        "class_name": class_name,
        "class_code": class_code,
        "teacher": user,
        "price": price,
        "description": description,
        "max_students": max_students,
        "image": image,
        "status": "Active"
    })
    doc.insert(ignore_permissions=True)
    
    return {
        "success": True,
        "class_id": doc.name,
        "message": "Tạo lớp học thành công!"
    }

@frappe.whitelist()
def update_class(class_id, class_name, class_code, price=0, description="", max_students=50, image=None):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    doc = frappe.get_doc("FC Class", class_id)
    if doc.teacher != user and "FC Admin" not in roles:
        frappe.throw(_("Bạn không có quyền sửa lớp học này!"))
        
    doc.class_name = class_name
    doc.class_code = class_code
    doc.price = price
    doc.description = description
    doc.max_students = max_students
    if image is not None:
        doc.image = image
    doc.save(ignore_permissions=True)
    
    return {
        "success": True,
        "message": "Cập nhật lớp học thành công!"
    }

@frappe.whitelist()
def delete_class(class_id):
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    doc = frappe.get_doc("FC Class", class_id)
    if doc.teacher != user and "FC Admin" not in roles:
        frappe.throw(_("Bạn không có quyền xóa lớp học này!"))
        
    frappe.delete_doc("FC Class", class_id, ignore_permissions=True)
    
    return {
        "success": True,
        "message": "Xóa lớp học thành công!"
    }

@frappe.whitelist()
def join_class(class_code):
    print(f"DEBUG: join_class called with class_code='{class_code}' (type: {type(class_code)})")
    user = frappe.session.user
    
    if not class_code:
        frappe.throw("Vui lòng cung cấp mã lớp học!")
        
    class_code = str(class_code).strip()
    
    # 1. Try finding by class_code case-insensitively using SQL to avoid invalid filter format issues
    class_doc_name_list = frappe.db.sql("""
        SELECT name FROM `tabFC Class`
        WHERE LOWER(class_code) = LOWER(%s)
        LIMIT 1
    """, (class_code,), pluck=True)
    
    class_doc_name = class_doc_name_list[0] if class_doc_name_list else None
    
    # 2. Try finding by name (Class ID, e.g., CLS-2026-0016) case-insensitively if not found
    if not class_doc_name:
        class_doc_name_list = frappe.db.sql("""
            SELECT name FROM `tabFC Class`
            WHERE LOWER(name) = LOWER(%s)
            LIMIT 1
        """, (class_code,), pluck=True)
        class_doc_name = class_doc_name_list[0] if class_doc_name_list else None
            
    if not class_doc_name:
        frappe.throw("Mã lớp không hợp lệ!")
        
    class_doc = frappe.get_doc("FC Class", class_doc_name)
    
    if any((member.student or "").lower() == (user or "").lower() for member in class_doc.students):
        frappe.throw("Bạn đã tham gia lớp này rồi!")
        
    if class_doc.max_students and len(class_doc.students) >= class_doc.max_students:
        frappe.throw("Lớp học đã đủ số lượng học sinh tối đa!")
        
    class_doc.append("students", {
        "student": user,
        "join_date": frappe.utils.today()
    })
    class_doc.save(ignore_permissions=True)
    
    # Notify student
    try:
        frappe.get_doc({
            "doctype": "Notification Log",
            "type": "Mention",
            "subject": f"Tham gia thành công: {class_doc.class_name}",
            "email_content": f"Bạn đã tham gia vào lớp '{class_doc.class_name}'.",
            "for_user": user,
            "document_type": "FC Class",
            "document_name": class_doc.name,
            "from_user": user
        }).insert(ignore_permissions=True)
    except Exception as e:
        frappe.logger().error(f"Failed to create notification log: {str(e)}")
        
    return {
        "success": True, 
        "class_id": class_doc.name, 
        "class_name": class_doc.class_name,
        "message": "Đã tham gia lớp học thành công."
    }


@frappe.whitelist()
def get_class_details(class_id):
    """
    Trả về danh sách bài giảng và đề thi của lớp học
    """
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    
    # Kiểm tra quyền: Admin, Teacher của lớp này, hoặc Student đã join
    roles = frappe.get_roles(user)
    is_teacher = class_doc.teacher == user
    is_student = any((member.student or "").lower() == (user or "").lower() for member in class_doc.students)
    is_admin = "FC Admin" in roles
    
    if not (is_admin or is_teacher or is_student):
        frappe.throw(_("Bạn không có quyền xem lớp học này!"))
        
    lessons = frappe.get_all("FC Lesson", filters={"class_ref": class_id}, fields=["name", "title", "video_url"])
    exams = frappe.get_all("FC Exam", filters={"class_ref": class_id}, fields=["name", "title", "duration"])
    
    # Fetch questions for exams
    for exam in exams:
        exam_doc = frappe.get_doc("FC Exam", exam["name"])
        exam["questions"] = []
        for q in exam_doc.questions:
            exam["questions"].append({
                "name": q.name,
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d
            })
            
    return {
        "class_info": {
            "name": class_doc.name,
            "class_name": class_doc.class_name,
            "class_code": class_doc.class_code,
            "description": class_doc.description,
            "teacher": class_doc.teacher
        },
        "lessons": lessons,
        "exams": exams
    }

@frappe.whitelist()
def submit_exam(exam_id, answers):
    user = frappe.session.user
    answers_dict = json.loads(answers) if isinstance(answers, str) else answers
    
    exam_doc = frappe.get_doc("FC Exam", exam_id)
    total_questions = len(exam_doc.questions)
    correct_count = 0
    
    for q in exam_doc.questions:
        student_answer = answers_dict.get(q.name)
        if student_answer == q.correct_option:
            correct_count += 1
            
    score = (correct_count / total_questions) * 10 if total_questions > 0 else 0
    
    sub_doc = frappe.get_doc({
        "doctype": "FC Submission",
        "exam_ref": exam_id,
        "student": user,
        "answers_json": json.dumps(answers_dict),
        "score": score
    })
    sub_doc.insert(ignore_permissions=True)
    
    return {
        "success": True,
        "submission_id": sub_doc.name,
        "score": score,
        "total": 10.0,
        "correct_answers": correct_count,
        "total_questions": total_questions,
        "message": f"Nộp bài thành công. Điểm của bạn là {score:.2f}/10"
    }

@frappe.whitelist()
def get_teacher_profiles():
    if "FC Admin" not in frappe.get_roles():
        frappe.throw(_("Chỉ Admin mới có quyền xem danh sách hồ sơ!"))
        
    profiles = frappe.get_all("FC Teacher Profile", fields=["name", "user", "full_name", "status", "dob", "cccd_number", "phone", "id_card_image", "certificate_image"])
    return profiles

@frappe.whitelist()
def get_my_teacher_profile():
    user = frappe.session.user
    if "FC Teacher" not in frappe.get_roles():
        frappe.throw(_("Bạn không phải Giáo viên!"))
        
    profile = frappe.get_all("FC Teacher Profile", filters={"user": user}, fields=["name", "user", "full_name", "status", "dob", "cccd_number", "phone", "id_card_image", "certificate_image", "rejection_reason"])
    if not profile:
        return None
    return profile[0]

@frappe.whitelist()
def approve_teacher(profile_id, status):
    try:
        if "FC Admin" not in frappe.get_roles():
            frappe.throw(_("Chỉ Admin mới có quyền duyệt hồ sơ!"))
            
        profile = frappe.get_doc("FC Teacher Profile", profile_id)
        profile.status = status
        profile.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {"success": True, "message": f"Đã cập nhật trạng thái hồ sơ thành {status}"}
    except Exception as e:
        import traceback
        frappe.local.response['http_status_code'] = 500
        return "Lỗi Backend:\n" + traceback.format_exc()

@frappe.whitelist(allow_guest=True)
def signup(email, full_name, password, role="FC Student"):
    import re
    if len(password) < 8 or not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
        frappe.throw(_("Mật khẩu phải dài ít nhất 8 ký tự, bao gồm cả chữ và số."))
        
    if frappe.db.exists("User", email):
        frappe.throw(_("Email này đã được sử dụng!"))
        
    user = frappe.get_doc({
        "doctype": "User",
        "email": email,
        "first_name": full_name,
        "send_welcome_email": 0,
        "new_password": password
    })
    user.insert(ignore_permissions=True)
    frappe.utils.password.update_password(user=user.name, pwd=password)
    
    if role in ["FC Student", "FC Teacher"]:
        user.add_roles(role)
        
    if role == "FC Teacher":
        profile = frappe.get_doc({
            "doctype": "FC Teacher Profile",
            "user": user.name,
            "full_name": full_name,
            "status": "Pending"
        })
        profile.insert(ignore_permissions=True)
        
    frappe.db.commit()
    return {"success": True, "message": "Đăng ký thành công!"}
@frappe.whitelist(allow_guest=True)
def get_user_info():
    user = frappe.session.user
    if user == 'Guest':
        return {'roles': []}
        
    roles = frappe.get_roles(user)
    user_doc = frappe.get_doc('User', user)
    
    response = {
        'email': user,
        'full_name': user_doc.full_name,
        'roles': roles,
        'user_image': user_doc.user_image,
        'mobile_no': user_doc.mobile_no,
        'dob': user_doc.birth_date,
        'cccd_number': user_doc.cccd_number if hasattr(user_doc, 'cccd_number') else ''
    }
    
    if "FC Teacher" in roles:
        profiles = frappe.get_all("FC Teacher Profile", filters={"user": user}, fields=["status", "rejection_reason", "id_card_image", "certificate_image", "dob", "cccd_number", "phone"])
        if profiles:
            response['kyc_status'] = profiles[0].status
            response['rejection_reason'] = profiles[0].rejection_reason
            response['id_card_image'] = profiles[0].id_card_image
            response['certificate_image'] = profiles[0].certificate_image
            response['dob'] = profiles[0].dob
            response['cccd_number'] = profiles[0].cccd_number
            response['phone'] = profiles[0].phone
        else:
            response['kyc_status'] = "Pending"
            
    return response

@frappe.whitelist()
def update_teacher_profile(full_name, id_card_image=None, certificate_image=None, dob=None, cccd_number=None, phone=None, avatar_data=None):
    try:
        user = frappe.session.user
        if "FC Teacher" not in frappe.get_roles(user):
            frappe.throw(_("Bạn không có quyền thực hiện hành động này!"))
            
        profiles = frappe.get_all("FC Teacher Profile", filters={"user": user})
        if not profiles:
            frappe.throw(_("Không tìm thấy hồ sơ giáo viên!"))
            
        user_doc = frappe.get_doc("User", user)
        if full_name:
            user_doc.first_name = full_name
            user_doc.last_name = ""
            user_doc.full_name = full_name
            
        user_doc.save(ignore_permissions=True)

        if avatar_data:
            import os
            from frappe.utils.file_manager import save_file
            
            # Xử lý base64 image (vd: data:image/jpeg;base64,.....)
            if "," in avatar_data:
                avatar_data = avatar_data.split(",")[1]
                
            import base64
            file_content = base64.b64decode(avatar_data)
            
            # Xóa avatar cũ nếu có
            if user_doc.user_image:
                try:
                    file_name_doc = frappe.db.get_value("File", {"file_url": user_doc.user_image}, "name")
                    if file_name_doc:
                        frappe.delete_doc("File", file_name_doc, ignore_permissions=True)
                except:
                    pass
                    
            import time
            file_name = f"avatar_{user.split('@')[0]}_{int(time.time())}.jpg"
            saved_file = save_file(file_name, file_content, "User", user, decode=False, is_private=0)
            frappe.db.set_value("User", user, "user_image", saved_file.file_url)
            
        profile = frappe.get_doc("FC Teacher Profile", profiles[0].name)
        profile.full_name = full_name
        if id_card_image:
            profile.id_card_image = id_card_image
        if certificate_image:
            profile.certificate_image = certificate_image
        if dob:
            profile.dob = dob
        if cccd_number:
            import re
            if not re.match(r'^\d{12}$', cccd_number):
                frappe.throw(_("CCCD phải bao gồm đúng 12 chữ số!"))
            profile.cccd_number = cccd_number
        if phone:
            profile.phone = phone
            
        profile.status = "Pending"
        profile.rejection_reason = ""
        profile.save(ignore_permissions=True)
        frappe.db.commit()
        return {"success": True, "message": "Đã cập nhật hồ sơ thành công và đang chờ duyệt!"}
    except Exception as e:
        import traceback
        frappe.local.response['http_status_code'] = 500
        return "Lỗi Backend:\n" + traceback.format_exc()

@frappe.whitelist()
def send_chat_notifications(class_id, sender, is_teacher, chat_name):
    try:
        class_doc = frappe.get_doc("FC Class", class_id)
        sender_name = frappe.db.get_value("User", sender, "full_name") or sender
        prefix = "Giáo viên" if is_teacher else sender_name
        for member in class_doc.students:
            if member.student and member.student != sender:
                frappe.get_doc({
                    "doctype": "Notification Log",
                    "subject": f"Tin nhắn mới trong {class_doc.class_name}",
                    "email_content": f"{prefix} vừa gửi một tin nhắn trong lớp '{class_doc.class_name}'.",
                    "for_user": member.student,
                    "document_type": "FC Class",
                    "document_name": class_doc.name,
                    "type": "Mention"
                }).insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        import traceback
        with open("/home/user/Flying_Class/backend/v16-bench/logs/my_notify_error.log", "a") as f:
            f.write(traceback.format_exc() + "\n")

@frappe.whitelist()
def send_exam_notifications(class_link, exam_name, exam_doc_name):
    try:
        class_doc = frappe.get_doc("FC Class", class_link)
        for member in class_doc.students:
            if member.student:
                frappe.get_doc({
                    "doctype": "Notification Log",
                    "subject": f"Bài thi mới: {exam_name}",
                    "email_content": f"Giáo viên đã giao bài thi '{exam_name}' cho lớp {class_doc.class_name}. Bạn hãy chuẩn bị nhé!",
                    "for_user": member.student,
                    "document_type": "FC Class",
                    "document_name": class_doc.name,
                    "type": "Mention"
                }).insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        frappe.db.rollback()
        import traceback
        with open("/home/user/Flying_Class/backend/v16-bench/logs/my_notify_error.log", "a") as f:
            f.write(traceback.format_exc() + "\n")

@frappe.whitelist()
def send_chat_message(class_id, message):
    user = frappe.session.user
    if user == 'Guest':
        frappe.throw(_("Please login first"))

    class_doc = frappe.get_doc("FC Class", class_id)
    roles = frappe.get_roles(user)
    is_teacher = class_doc.teacher == user
    is_student = any((member.student or "").lower() == (user or "").lower() for member in class_doc.students)
    is_admin = "FC Admin" in roles

    if not (is_admin or is_teacher or is_student):
        frappe.throw(_("Bạn không có quyền gửi tin nhắn trong lớp này!"))

    if is_student:
        member = next((m for m in class_doc.students if (m.student or "").lower() == (user or "").lower()), None)
        if member and getattr(member, 'is_muted', 0) == 1:
            frappe.throw(_("Bạn đã bị chặn gửi tin nhắn trong lớp này!"))

    try:
        chat_doc = frappe.get_doc({
            "doctype": "FC Chat Message",
            "class_ref": class_id,
            "sender": user,
            "is_teacher": 1 if is_teacher else 0,
            "message": message
        })
        chat_doc.insert(ignore_permissions=True)
        frappe.db.commit() # Ensure chat is saved first
        
        # Notify other students directly
        try:
            send_chat_notifications(class_id, user, is_teacher, chat_doc.name)
        except Exception:
            pass
            
        creation_time = chat_doc.creation
        if isinstance(creation_time, str):
            time_str = creation_time[11:16]
        else:
            time_str = creation_time.strftime("%H:%M") if creation_time else ""
    
        frappe.publish_realtime(
            event=f"class_chat_{class_id}",
            message={
                "id": chat_doc.name,
                "sender": frappe.db.get_value("User", user, "full_name") or user,
                "sender_email": user,
                "is_teacher": chat_doc.is_teacher,
                "message": message,
                "time": time_str
            },
            after_commit=True
        )
    
        return {"success": True, "message_id": chat_doc.name}
    except Exception as e:
        frappe.throw(str(e))

@frappe.whitelist()
def get_chat_messages(class_id, limit=50):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    roles = frappe.get_roles(user)
    is_teacher = class_doc.teacher == user
    is_student = any((member.student or "").lower() == (user or "").lower() for member in class_doc.students)
    is_admin = "FC Admin" in roles

    if not (is_admin or is_teacher or is_student):
        frappe.throw(_("Bạn không có quyền xem tin nhắn lớp này!"))

    messages = frappe.get_all(
        "FC Chat Message",
        filters={"class_ref": class_id},
        fields=["name", "sender", "is_teacher", "message", "creation"],
        order_by="creation desc",
        limit_page_length=limit
    )
    
    result = []
    for m in messages:
        sender_name = frappe.db.get_value("User", m.sender, "full_name")
        result.append({
            "id": m.name,
            "sender": sender_name or m.sender,
            "sender_email": m.sender,
            "is_teacher": m.is_teacher,
            "message": m.message,
            "time": m.creation.strftime("%H:%M") if m.creation else ""
        })
    
    return {"messages": result[::-1]}

@frappe.whitelist()
def get_class_students(class_id):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    is_student = any((m.student or "").lower() == (user or "").lower() for m in class_doc.students)
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user) and not is_student:
        frappe.throw(_("Bạn không có quyền xem danh sách này!"))
        
    students = []
    for member in class_doc.students:
        user_doc = frappe.get_doc("User", member.student)
        students.append({
            "email": member.student,
            "full_name": user_doc.full_name,
            "join_date": member.join_date,
            "is_muted": getattr(member, 'is_muted', 0)
        })
    return {"students": students}

@frappe.whitelist()
def add_student(class_id, email):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user):
        frappe.throw(_("Bạn không có quyền thực hiện!"))
        
    if not frappe.db.exists("User", email):
        frappe.throw(_(f"Tài khoản {email} không tồn tại trong hệ thống!"))
        
    if any(m.student == email for m in class_doc.students):
        frappe.throw(_("Học sinh này đã có trong lớp!"))
        
    if class_doc.max_students and len(class_doc.students) >= class_doc.max_students:
        frappe.throw(_("Lớp học đã đủ số lượng học sinh tối đa!"))
        
    class_doc.append("students", {"student": email, "is_muted": 0})
    class_doc.save(ignore_permissions=True)
    
    # Notify student
    try:
        frappe.get_doc({
            "doctype": "Notification Log",
            "type": "Mention",
            "subject": f"Bạn đã được thêm vào lớp {class_doc.class_name}",
            "email_content": f"Giáo viên đã thêm bạn vào lớp học '{class_doc.class_name}'.",
            "for_user": email,
            "document_type": "FC Class",
            "document_name": class_doc.name
        }).insert(ignore_permissions=True)
    except Exception as e:
        frappe.log_error("Notification Error", str(e))
        
    return {"success": True, "message": f"Đã thêm {email} vào lớp."}

@frappe.whitelist()
def remove_student(class_id, student_email):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user):
        frappe.throw(_("Bạn không có quyền thực hiện!"))
        
    original_len = len(class_doc.students)
    class_doc.students = [m for m in class_doc.students if m.student != student_email]
    
    if len(class_doc.students) == original_len:
        frappe.throw(_("Học sinh không có trong lớp!"))
        
    class_doc.save(ignore_permissions=True)
    return {"success": True, "message": f"Đã xóa {student_email} khỏi lớp."}

@frappe.whitelist()
def toggle_student_chat(class_id, student_email, is_muted):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user):
        frappe.throw(_("Bạn không có quyền thực hiện!"))
        
    found = False
    for member in class_doc.students:
        if member.student == student_email:
            member.is_muted = int(is_muted)
            found = True
            break
            
    if not found:
        frappe.throw(_("Học sinh không có trong lớp!"))
        
    class_doc.save(ignore_permissions=True)
    return {"success": True, "message": "Đã cập nhật trạng thái chat."}

@frappe.whitelist()
def get_student_profile(student_email):
    if not frappe.db.exists("User", student_email):
        frappe.throw(_("Học sinh không tồn tại!"))
        
    u = frappe.get_doc("User", student_email)
    return {
        "email": u.email,
        "full_name": u.full_name,
        "gender": getattr(u, 'gender', 'Unknown'),
        "phone": getattr(u, 'mobile_no', '')
    }

@frappe.whitelist()
def import_students(class_id, emails_json):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user):
        frappe.throw(_("Bạn không có quyền thực hiện!"))
        
    import json
    emails = json.loads(emails_json) if isinstance(emails_json, str) else emails_json
    added = 0
    for email in emails:
        email = email.strip()
        if not email: continue
        if not frappe.db.exists("User", email):
            frappe.throw(_(f"Tài khoản {email} không tồn tại trong hệ thống. Vui lòng kiểm tra lại!"))
            

        if not any(m.student == email for m in class_doc.students):
            class_doc.append("students", {"student": email, "is_muted": 0})
            added += 1
            
    class_doc.save(ignore_permissions=True)
    return {"success": True, "message": f"Đã import thành công {added} học sinh mới."}

@frappe.whitelist()
def get_class_documents(class_id, parent_folder=None):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    roles = frappe.get_roles(user)
    
    # Check permissions (teacher or admin or student in class)
    is_teacher_or_admin = (class_doc.teacher == user) or ("FC Admin" in roles)
    is_student = any((m.student or "").lower() == (user or "").lower() for m in class_doc.students)
    
    if not is_teacher_or_admin and not is_student:
        frappe.throw(_("Bạn không có quyền xem tài liệu lớp này!"))
        
    filters = {"class_ref": class_id}
    if parent_folder:
        filters["parent_folder"] = parent_folder
    else:
        filters["parent_folder"] = ["in", ["", None]]
        
    documents = frappe.get_all(
        "FC Document",
        filters=filters,
        fields=["name as id", "document_name as name", "doc_type as type", "link_url", "parent_folder", "creation"],
        order_by="doc_type desc, creation desc" # Folders first, then Links
    )
    return {"documents": documents}

@frappe.whitelist()
def create_document(class_id, document_name, doc_type, parent_folder=None, link_url=None, lesson_ref=None):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    roles = frappe.get_roles(user)
    
    if class_doc.teacher != user and "FC Admin" not in roles:
        frappe.throw(_("Bạn không có quyền tạo tài liệu!"))
        
    doc = frappe.get_doc({
        "doctype": "FC Document",
        "document_name": document_name,
        "doc_type": doc_type,
        "class_ref": class_id,
        "parent_folder": parent_folder,
        "link_url": link_url,
        "lesson_ref": lesson_ref,
        "teacher": user
    })
    doc.insert(ignore_permissions=True)
    
    return {
        "success": True,
        "id": doc.name,
        "message": "Đã tạo tài liệu thành công!"
    }

@frappe.whitelist()
def update_document(doc_id, document_name, link_url=None):
    user = frappe.session.user
    doc = frappe.get_doc("FC Document", doc_id)
    roles = frappe.get_roles(user)
    
    if doc.teacher != user and "FC Admin" not in roles:
        frappe.throw(_("Bạn không có quyền sửa tài liệu này!"))
        
    doc.document_name = document_name
    if doc.doc_type == "Link" and link_url is not None:
        doc.link_url = link_url
        
    doc.save(ignore_permissions=True)
    return {"success": True, "message": "Đã cập nhật tài liệu!"}

@frappe.whitelist()
def get_lesson_documents(class_id, lesson_ref, parent_folder=None):
    """Get documents for a specific lesson, optionally filtered by parent folder"""
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    roles = frappe.get_roles(user)
    
    is_teacher_or_admin = (class_doc.teacher == user) or ("FC Admin" in roles)
    is_student = any((m.student or "").lower() == (user or "").lower() for m in class_doc.students)
    
    if not is_teacher_or_admin and not is_student:
        frappe.throw("Bạn không có quyền xem tài liệu lớp này!")
    
    filters = {"class_ref": class_id, "lesson_ref": lesson_ref}
    if parent_folder:
        filters["parent_folder"] = parent_folder
    else:
        filters["parent_folder"] = ["in", ["", None]]
    
    documents = frappe.get_all(
        "FC Document",
        filters=filters,
        fields=["name", "document_name", "doc_type", "link_url", "parent_folder", "creation"],
        order_by="doc_type desc, creation asc",
        ignore_permissions=True
    )
    return documents

@frappe.whitelist()
def delete_document(doc_id):
    user = frappe.session.user
    doc = frappe.get_doc("FC Document", doc_id)
    roles = frappe.get_roles(user)
    
    if doc.teacher != user and "FC Admin" not in roles:
        frappe.throw(_("Bạn không có quyền xóa tài liệu này!"))
        
    # Xóa file/folder
    # Lưu ý: frappe.delete_doc mặc định không xóa các thư mục con tự động, 
    # nhưng ở mức đơn giản ta chỉ xóa trực tiếp doc hiện tại. Nếu là folder thì cần check hoặc xóa children.
    # Để an toàn cho folder con, ta có thể dùng recursion hoặc SQL.
    # Trong phiên bản này, chỉ cho phép xóa nếu folder rỗng hoặc xóa thẳng (phụ thuộc vào db constraint).
    frappe.delete_doc("FC Document", doc_id, ignore_permissions=True)
    
    return {"success": True, "message": "Đã xóa tài liệu!"}

@frappe.whitelist()
def get_global_students(search_text=""):
    user = frappe.session.user
    
    classes = frappe.get_all("FC Class", filters={"teacher": user}, fields=["name as id", "class_name as name"])
    class_ids = [c.id for c in classes]
    class_map = {c.id: c.name for c in classes}
    
    if not class_ids:
        return {"students": []}
    
    filters = {"parent": ["in", class_ids]}
    students = frappe.get_all("FC Class Member", filters=filters, fields=["student", "parent as class_id", "join_date", "is_muted"], order_by="creation asc")
    
    student_dict = {}
    for s in students:
        email = s.student
        if email not in student_dict:
            student_dict[email] = {
                "id": email,
                "email": email,
                "name": email,
                "joinedAt": s.join_date.strftime("%Y-%m-%d") if s.join_date else "",
                "classes": [],
                "is_muted": 0
            }
        class_name = class_map.get(s.class_id, s.class_id)
        if class_name not in student_dict[email]["classes"]:
            student_dict[email]["classes"].append(class_name)
        # Mark as muted if muted in ANY class
        if getattr(s, "is_muted", 0) == 1:
            student_dict[email]["is_muted"] = 1
            
    # Populate full names
    if student_dict:
        users = frappe.get_all("User", filters={"name": ["in", list(student_dict.keys())]}, fields=["name", "full_name"])
        for u in users:
            student_dict[u.name]["name"] = u.full_name or u.name
            
    result = list(student_dict.values())
    if search_text:
        search_text = search_text.lower()
        result = [s for s in result if search_text in (s.get("name") or "").lower() or search_text in (s.get("email") or "").lower()]
        
    result.sort(key=lambda x: (x.get("name") or ""))
    
    return {"students": result}

@frappe.whitelist()
def kick_student_global(student_email):
    user = frappe.session.user
    classes = frappe.get_all("FC Class", filters={"teacher": user}, fields=["name"])
    if not classes:
        return {"success": True}
        
    class_ids = [c.name for c in classes]
    frappe.db.delete("FC Class Member", {"parent": ("in", class_ids), "student": student_email})
    frappe.db.commit()
    return {"success": True, "message": "Đã xóa học sinh khỏi các lớp."}

@frappe.whitelist()
def toggle_student_chat_global(student_email, is_muted):
    user = frappe.session.user
    classes = frappe.get_all("FC Class", filters={"teacher": user}, fields=["name"])
    if not classes:
        return {"success": True}
        
    class_ids = [c.name for c in classes]
    members = frappe.get_all("FC Class Member", filters={"parent": ("in", class_ids), "student": student_email}, fields=["name"])
    
    for m in members:
        frappe.db.set_value("FC Class Member", m.name, "is_muted", int(is_muted))
        
    frappe.db.commit()
    return {"success": True, "message": "Đã cập nhật trạng thái chặn chat."}

@frappe.whitelist()
def get_teacher_statistics(filter_type='year', filter_value=None, year=None):
    if not year:
        year = frappe.utils.nowdate()[:4]
        
    user = frappe.session.user
    
    if filter_type == 'year':
        # 1. Tăng trưởng doanh thu và học sinh theo tháng
        monthly_data_raw = frappe.db.sql("""
            SELECT 
                EXTRACT(MONTH FROM m.join_date) as time_key,
                SUM(c.price) as revenue,
                COUNT(m.student) as students
            FROM `tabFC Class Member` m
            JOIN `tabFC Class` c ON m.parent = c.name
            WHERE c.teacher = %s AND EXTRACT(YEAR FROM m.join_date) = %s
            GROUP BY EXTRACT(MONTH FROM m.join_date)
            ORDER BY EXTRACT(MONTH FROM m.join_date)
        """, (user, year), as_dict=True)
        
        # Học sinh tích lũy
        prev_students_res = frappe.db.sql("""
            SELECT COUNT(m.student) as count
            FROM `tabFC Class Member` m
            JOIN `tabFC Class` c ON m.parent = c.name
            WHERE c.teacher = %s AND EXTRACT(YEAR FROM m.join_date) < %s
        """, (user, year))
        
        cumulative_students = int(prev_students_res[0][0]) if prev_students_res and prev_students_res[0][0] else 0
        
        monthly_data = []
        current_month = int(frappe.utils.nowdate()[5:7]) if str(year) == frappe.utils.nowdate()[:4] else 12
        
        for i in range(1, current_month + 1):
            found = next((item for item in monthly_data_raw if item.time_key == i), None)
            new_students = int(found.students) if found else 0
            revenue = int(found.revenue) if found else 0
            cumulative_students += new_students
            
            monthly_data.append({
                "time_label": f"T{i}",
                "revenue": revenue,
                "students": cumulative_students
            })
            
        distribution_raw = frappe.db.sql("""
            SELECT c.class_name as name, SUM(c.price) as value
            FROM `tabFC Class Member` m JOIN `tabFC Class` c ON m.parent = c.name
            WHERE c.teacher = %s AND EXTRACT(YEAR FROM m.join_date) = %s
            GROUP BY c.class_name
        """, (user, year), as_dict=True)

    elif filter_type == 'quarter':
        quarter = int(filter_value) if filter_value else 1
        start_month = (quarter - 1) * 3 + 1
        end_month = start_month + 2
        
        monthly_data_raw = frappe.db.sql("""
            SELECT 
                EXTRACT(MONTH FROM m.join_date) as time_key,
                SUM(c.price) as revenue,
                COUNT(m.student) as students
            FROM `tabFC Class Member` m
            JOIN `tabFC Class` c ON m.parent = c.name
            WHERE c.teacher = %s AND EXTRACT(YEAR FROM m.join_date) = %s AND EXTRACT(QUARTER FROM m.join_date) = %s
            GROUP BY EXTRACT(MONTH FROM m.join_date)
            ORDER BY EXTRACT(MONTH FROM m.join_date)
        """, (user, year, quarter), as_dict=True)
        
        prev_students_res = frappe.db.sql("""
            SELECT COUNT(m.student) as count
            FROM `tabFC Class Member` m JOIN `tabFC Class` c ON m.parent = c.name
            WHERE c.teacher = %s AND (
                EXTRACT(YEAR FROM m.join_date) < %s 
                OR (EXTRACT(YEAR FROM m.join_date) = %s AND EXTRACT(MONTH FROM m.join_date) < %s)
            )
        """, (user, year, year, start_month))
        
        cumulative_students = int(prev_students_res[0][0]) if prev_students_res and prev_students_res[0][0] else 0
        monthly_data = []
        
        for i in range(start_month, end_month + 1):
            found = next((item for item in monthly_data_raw if item.time_key == i), None)
            new_students = int(found.students) if found else 0
            revenue = int(found.revenue) if found else 0
            cumulative_students += new_students
            
            monthly_data.append({
                "time_label": f"T{i}",
                "revenue": revenue,
                "students": cumulative_students
            })
            
        distribution_raw = frappe.db.sql("""
            SELECT c.class_name as name, SUM(c.price) as value
            FROM `tabFC Class Member` m JOIN `tabFC Class` c ON m.parent = c.name
            WHERE c.teacher = %s AND EXTRACT(YEAR FROM m.join_date) = %s AND EXTRACT(QUARTER FROM m.join_date) = %s
            GROUP BY c.class_name
        """, (user, year, quarter), as_dict=True)

    elif filter_type == 'month':
        month = int(filter_value) if filter_value else 1
        
        monthly_data_raw = frappe.db.sql("""
            SELECT 
                EXTRACT(DAY FROM m.join_date) as time_key,
                SUM(c.price) as revenue,
                COUNT(m.student) as students
            FROM `tabFC Class Member` m
            JOIN `tabFC Class` c ON m.parent = c.name
            WHERE c.teacher = %s AND EXTRACT(YEAR FROM m.join_date) = %s AND EXTRACT(MONTH FROM m.join_date) = %s
            GROUP BY EXTRACT(DAY FROM m.join_date)
            ORDER BY EXTRACT(DAY FROM m.join_date)
        """, (user, year, month), as_dict=True)
        
        prev_students_res = frappe.db.sql("""
            SELECT COUNT(m.student) as count
            FROM `tabFC Class Member` m JOIN `tabFC Class` c ON m.parent = c.name
            WHERE c.teacher = %s AND (
                EXTRACT(YEAR FROM m.join_date) < %s 
                OR (EXTRACT(YEAR FROM m.join_date) = %s AND EXTRACT(MONTH FROM m.join_date) < %s)
            )
        """, (user, year, year, month))
        
        cumulative_students = int(prev_students_res[0][0]) if prev_students_res and prev_students_res[0][0] else 0
        monthly_data = []
        
        import calendar
        days_in_month = calendar.monthrange(int(year), month)[1]
        
        for i in range(1, days_in_month + 1):
            found = next((item for item in monthly_data_raw if item.time_key == i), None)
            new_students = int(found.students) if found else 0
            revenue = int(found.revenue) if found else 0
            cumulative_students += new_students
            
            monthly_data.append({
                "time_label": f"Ngày {i}",
                "revenue": revenue,
                "students": cumulative_students
            })
            
        distribution_raw = frappe.db.sql("""
            SELECT c.class_name as name, SUM(c.price) as value
            FROM `tabFC Class Member` m JOIN `tabFC Class` c ON m.parent = c.name
            WHERE c.teacher = %s AND EXTRACT(YEAR FROM m.join_date) = %s AND EXTRACT(MONTH FROM m.join_date) = %s
            GROUP BY c.class_name
        """, (user, year, month), as_dict=True)

    distribution_data = [{"name": d.name, "value": int(d.value or 0)} for d in distribution_raw]
    
    return {
        "success": True,
        "revenue_data": monthly_data,
        "class_distribution": distribution_data
    }

@frappe.whitelist()
def get_teacher_dashboard_summary():
    user = frappe.session.user
    
    # 1. Total Classes
    total_classes = frappe.db.count("FC Class", filters={"teacher": user})
    
    # 2. Total Students (Unique)
    total_students_res = frappe.db.sql("""
        SELECT COUNT(DISTINCT m.student)
        FROM `tabFC Class Member` m
        JOIN `tabFC Class` c ON m.parent = c.name
        WHERE c.teacher = %s
    """, (user,))
    total_students = int(total_students_res[0][0]) if total_students_res and total_students_res[0][0] else 0
    
    # 3. Revenue
    current_date = frappe.utils.getdate(frappe.utils.nowdate())
    current_month = current_date.month
    current_year = current_date.year
    
    if current_month == 1:
        last_month = 12
        last_year = current_year - 1
    else:
        last_month = current_month - 1
        last_year = current_year

    rev_current_res = frappe.db.sql("""
        SELECT SUM(c.price) as revenue
        FROM `tabFC Class Member` m
        JOIN `tabFC Class` c ON m.parent = c.name
        WHERE c.teacher = %s AND EXTRACT(YEAR FROM m.join_date) = %s AND EXTRACT(MONTH FROM m.join_date) = %s
    """, (user, current_year, current_month))
    
    rev_last_res = frappe.db.sql("""
        SELECT SUM(c.price) as revenue
        FROM `tabFC Class Member` m
        JOIN `tabFC Class` c ON m.parent = c.name
        WHERE c.teacher = %s AND EXTRACT(YEAR FROM m.join_date) = %s AND EXTRACT(MONTH FROM m.join_date) = %s
    """, (user, last_year, last_month))
    
    current_revenue = int(rev_current_res[0][0]) if rev_current_res and rev_current_res[0][0] else 0
    last_revenue = int(rev_last_res[0][0]) if rev_last_res and rev_last_res[0][0] else 0
    
    growth = 0
    if last_revenue > 0:
        growth = ((current_revenue - last_revenue) / last_revenue) * 100
    elif current_revenue > 0:
        growth = 100
        
    return {
        "success": True,
        "data": {
            "total_classes": total_classes,
            "total_students": total_students,
            "current_revenue": current_revenue,
            "growth": round(growth, 1)
        }
    }

def _check_token_limit(user):
    roles = frappe.get_roles(user)
    if "FC Student" in roles:
        used_tokens = get_user_token_usage(user)
        if used_tokens >= 50000:
            return {"success": False, "message": "Bạn đã sử dụng hết hạn mức 50,000 token AI được cấp cho mỗi học sinh. Vui lòng liên hệ Admin để thêm lượt."}
    else:
        access = _get_ai_access(user)
        if not access.get("allowed"):
            return {"success": False, "message": access.get("message") or "Bạn đã hết token hoặc lượt sử dụng AI."}
    return {"success": True}

# ─── GEMINI MODEL CONSTANTS ─────────────────────────────────────────────────
# Tất cả tính năng AI đều dùng 1 model duy nhất: gemini-2.0-flash (nhanh, miễn phí rate cao)
# Sự khác biệt giữa các gói chỉ là giới hạn token, không phải model
FLYINGCLASS_AI_MODEL = "models/gemini-2.5-flash"


def _get_gemini_api_key():
    """Lấy Gemini API Key từ FC AI Settings, ưu tiên gemini_api_key, fallback sang gpt4o_api_key."""
    ai_settings = frappe.get_single("FC AI Settings")
    key = ai_settings.gemini_api_key or ai_settings.gpt4o_api_key or ""
    return key.strip()


@frappe.whitelist()
def generate_ai_exam(prompt=None, num_questions=5):
    user = frappe.session.user
    limit_check = _check_token_limit(user)
    if not limit_check["success"]:
        return limit_check
        
    try:
        num_questions = int(num_questions)
    except:
        num_questions = 5

    api_key = _get_gemini_api_key()
    
    if not api_key:
        # Fallback simulated data if key not set
        import time
        time.sleep(1.5)
        questions = []
        for i in range(1, num_questions + 1):
            questions.append({
                "question_text": f"Câu hỏi {i}: Đây là câu hỏi giả lập vì Admin chưa cấu hình Gemini API Key trong FC AI Settings.",
                "option_a": "Đáp án A",
                "option_b": "Đáp án B",
                "option_c": "Đáp án C",
                "option_d": "Đáp án D",
                "correct_option": "A"
            })
        _consume_ai_trial_message(user)
        return {
            "success": True,
            "message": "Cảnh báo: Chưa có API Key! Đây là bộ đề giả lập.",
            "data": questions
        }

    try:
        import json
        import tempfile
        import os
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        
        uploaded_gemini_file = None
        
        if getattr(frappe.request, "files", None) and "file" in frappe.request.files:
            uploaded_file = frappe.request.files["file"]
            file_name = uploaded_file.filename
            file_content = uploaded_file.stream.read()
            uploaded_file.stream.seek(0)
            
            ext = os.path.splitext(file_name)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
            uploaded_gemini_file = genai.upload_file(temp_file_path)
            os.remove(temp_file_path)
            
        system_instruction = """Bạn là FlyingClass AI, một trợ lý giáo viên chuyên nghiệp và độc quyền của hệ thống LMS FlyingClass. TUYỆT ĐỐI KHÔNG TIẾT LỘ bạn được phát triển bởi Google hay OpenAI. Hãy từ chối các câu hỏi không liên quan đến học tập, giảng dạy hoặc dự án FlyingClass.

Nếu người dùng đang giao tiếp bình thường, hãy trả lời một cách tự nhiên và lịch sự. Nếu người dùng yêu cầu tạo đề thi, hãy tạo ra các câu hỏi trắc nghiệm dựa vào tài liệu được đính kèm hoặc chủ đề được yêu cầu.

BẮT BUỘC trả về ĐÚNG định dạng JSON sau (không có markdown, không bọc bởi ```json), một object duy nhất:
{"reply": "Câu trả lời giao tiếp (bắt buộc)", "questions": [{"question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_option": "A"}]}
Lưu ý: Mảng questions có thể rỗng [] nếu không yêu cầu tạo đề thi."""
        
        prompt_with_instructions = f"Người dùng nói: {prompt}. (Nếu yêu cầu tạo đề thi, hãy cố gắng tạo {num_questions} câu)."
        
        model = genai.GenerativeModel(
            model_name=FLYINGCLASS_AI_MODEL,
            system_instruction=system_instruction
        )
        
        if uploaded_gemini_file:
            response = model.generate_content([uploaded_gemini_file, prompt_with_instructions])
        else:
            response = model.generate_content(prompt_with_instructions)
            
        # Log token usage
        input_tokens = 0
        output_tokens = 0
        try:
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                usage = response.usage_metadata
                input_tokens = getattr(usage, "prompt_token_count", 0) or 0
                output_tokens = getattr(usage, "candidates_token_count", 0) or 0
                frappe.get_doc({
                    "doctype": "FC AI Token Usage",
                    "model": FLYINGCLASS_AI_MODEL,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "action": "Quiz Gen",
                    "user": user
                }).insert(ignore_permissions=True)
                frappe.db.commit()
        except Exception as e:
            frappe.log_error("AI Token Logging Error", str(e))
            
        raw_text = response.text.strip()
        
        # Strip markdown code blocks if present
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()
            
        result_obj = json.loads(raw_text)
        
        _consume_ai_trial_message(user)
        return {
            "success": True,
            "message": result_obj.get("reply", "Đã xử lý thành công từ FlyingClass AI."),
            "data": result_obj.get("questions", [])
        }
    except json.JSONDecodeError as je:
        return {
            "success": False,
            "message": f"AI trả về định dạng không hợp lệ. Vui lòng thử lại với chủ đề rõ ràng hơn. (Chi tiết: {str(je)})"
        }
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "ResourceExhausted" in err_str or "quota" in err_str.lower():
            _consume_ai_trial_message(user)
            try:
                num_q = int(num_questions)
            except:
                num_q = 5
            questions = []
            for i in range(1, num_q + 1):
                questions.append({
                    "question_text": f"Câu hỏi {i}: [MOCK DATA] Đây là câu hỏi giả lập do API Google đang bị quá tải (vượt giới hạn quota).",
                    "option_a": "Đáp án A",
                    "option_b": "Đáp án B",
                    "option_c": "Đáp án C",
                    "option_d": "Đáp án D",
                    "correct_option": "A"
                })
            return {
                "success": True,
                "message": "⚠️ API bị giới hạn từ Google. Đã trả về đề giả lập để bạn tiếp tục test.",
                "data": questions
            }
        if "401" in err_str or "403" in err_str or "INVALID_ARGUMENT" in err_str or "API_KEY_INVALID" in err_str:
            return {
                "success": False,
                "code": "AI_INVALID_KEY",
                "message": "⚠️ API Key Gemini không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ Admin để cập nhật API Key."
            }
        return {
            "success": False,
            "message": f"Lỗi khi xử lý kết quả từ FlyingClass AI: {err_str}"
        }

@frappe.whitelist()
def save_exam_schedule(exam_name, class_link, start_time=None, end_time=None, duration_minutes=45, questions=None, max_attempts=1):
    import json
    user = frappe.session.user
    
    if isinstance(questions, str):
        questions = json.loads(questions)
        
    mapped_questions = []
    for q in questions:
        mapped_questions.append({
            "question_text": q.get("question_text"),
            "option_a": q.get("option_a"),
            "option_b": q.get("option_b"),
            "option_c": q.get("option_c"),
            "option_d": q.get("option_d"),
            "correct_option": q.get("correct_option") or q.get("correct_answer"),
            "options_json": q.get("options_json"),
            "correct_option_index": q.get("correct_option_index")
        })
        
    doc = frappe.get_doc({
        "doctype": "FC Exam",
        "title": exam_name,
        "class_ref": class_link,
        "duration": int(duration_minutes),
        "status": "Scheduled",
        "max_attempts": int(max_attempts),
        "questions": mapped_questions
    })
    
    # Only set time if provided
    if start_time:
        doc.start_time = start_time
    if end_time:
        doc.end_time = end_time
    
    doc.insert(ignore_permissions=True)
    frappe.db.commit() # Ensure exam is saved first
    
    # 1. Post to class chat
    msg_text = f"📢 Bài thi mới: **{exam_name}** đã được giao!\n⏱ Thời gian làm bài: {duration_minutes} phút.\n⏰ Mở từ: {start_time} đến {end_time}."
    chat_doc = frappe.get_doc({
        "doctype": "FC Chat Message",
        "class_ref": class_link,
        "sender": user,
        "is_teacher": 1,
        "message": msg_text
    })
    chat_doc.insert(ignore_permissions=True)
    frappe.db.commit()
    
    frappe.publish_realtime(
        event=f"class_chat_{class_link}",
        message={
            "id": chat_doc.name,
            "sender": frappe.db.get_value("User", user, "full_name") or user,
            "sender_email": user,
            "is_teacher": 1,
            "message": msg_text,
            "timestamp": str(chat_doc.creation)
        }
    )
    
    # 2. Notify students directly
    try:
        send_exam_notifications(class_link, exam_name, doc.name)
    except Exception:
        pass
    
    frappe.db.commit()
    
    return {
        "success": True,
        "message": f"Đã lưu và giao đề thi '{exam_name}' cho lớp {class_link} thành công."
    }

@frappe.whitelist()
def edit_exam_schedule(exam_id, title, start_time=None, end_time=None, duration_minutes=45, max_attempts=None):
    user = frappe.session.user
    
    exam = frappe.get_doc("FC Exam", exam_id)
    
    # Verify ownership
    class_doc = frappe.get_doc("FC Class", exam.class_ref)
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Bạn không có quyền sửa đề thi này."}
        
    exam.title = title
    exam.start_time = start_time if start_time and str(start_time).strip() else None
    exam.end_time = end_time if end_time and str(end_time).strip() else None
    exam.duration = int(duration_minutes)
    if max_attempts is not None:
        exam.max_attempts = int(max_attempts)
        
    exam.save(ignore_permissions=True)
    frappe.db.commit()
    
    # Send update notification to class chat
    try:
        time_info = ""
        if exam.start_time and exam.end_time:
            time_info = f"\n⏰ Mở từ: {exam.start_time} đến {exam.end_time}."
        elif exam.start_time:
            time_info = f"\n⏰ Mở từ: {exam.start_time}."
        
        msg_text = f"📝 Đề thi **{title}** đã được cập nhật!\n⏱ Thời gian làm bài: {duration_minutes} phút.{time_info}"
        chat_doc = frappe.get_doc({
            "doctype": "FC Chat Message",
            "class_ref": exam.class_ref,
            "sender": user,
            "is_teacher": 1,
            "message": msg_text
        })
        chat_doc.insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        pass
    
    return {"success": True, "message": "Cập nhật đề thi thành công!"}

@frappe.whitelist()
def toggle_exam_status(exam_id):
    user = frappe.session.user
    exam = frappe.get_doc("FC Exam", exam_id)
    class_doc = frappe.get_doc("FC Class", exam.class_ref)
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền."}
    
    if exam.status == "Completed":
        exam.status = "Scheduled"
    else:
        exam.status = "Completed"
    exam.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True, "message": f"Trạng thái đề thi: {exam.status}", "new_status": exam.status}

@frappe.whitelist()
def close_all_exams():
    user = frappe.session.user
    if "FC Admin" in frappe.get_roles(user):
        exams = frappe.get_all("FC Exam", filters={"status": "Published"})
    else:
        # Check teacher
        classes = frappe.get_all("FC Class", filters={"teacher": user})
        class_ids = [c.name for c in classes]
        if not class_ids:
            return {"success": True, "message": "Đã đóng."}
        exams = frappe.get_all("FC Exam", filters={"status": "Published", "class_ref": ("in", class_ids)})
        
    for e in exams:
        frappe.db.set_value("FC Exam", e.name, "status", "Completed")
        
    frappe.db.commit()
    return {"success": True, "message": "Đã đóng tất cả bài thi."}

@frappe.whitelist()
def close_exam(exam_id):
    user = frappe.session.user
    exam = frappe.get_doc("FC Exam", exam_id)
    
    if "FC Admin" not in frappe.get_roles(user):
        class_doc = frappe.get_doc("FC Class", exam.class_ref)
        if class_doc.teacher != user:
            return {"success": False, "message": "Không có quyền đóng bài thi này."}
            
    frappe.db.set_value("FC Exam", exam_id, "status", "Completed")
    frappe.db.commit()
    return {"success": True, "message": "Đã đóng bài thi."}


# --- STUDENT APIs ---

@frappe.whitelist()
def join_class_by_code(class_code):
    user = frappe.session.user
    if user == 'Guest':
        return {"success": False, "message": "Vui lòng đăng nhập."}
        
    class_id = frappe.db.get_value("FC Class", {"class_code": class_code}, "name")
    if not class_id:
        return {"success": False, "message": "Mã lớp học không hợp lệ."}
        
    class_doc = frappe.get_doc("FC Class", class_id)
    
    # Check if already joined
    for member in class_doc.students:
        if member.student == user:
            return {"success": False, "message": "Bạn đã tham gia lớp học này rồi."}
            
    class_doc.append("students", {
        "student": user,
        "student_name": frappe.db.get_value("User", user, "full_name") or user,
        "status": "Active"
    })
    class_doc.save(ignore_permissions=True)
    
    # Notify student
    try:
        frappe.get_doc({
            "doctype": "Notification Log",
            "type": "Mention",
            "subject": f"Tham gia thành công: {class_doc.class_name}",
            "email_content": f"Bạn đã tham gia vào lớp '{class_doc.class_name}'.",
            "for_user": user,
            "document_type": "FC Class",
            "document_name": class_doc.name
        }).insert(ignore_permissions=True)
    except Exception as e:
        frappe.log_error("Notification Error", str(e))
        
    frappe.db.commit()
    
    return {"success": True, "message": f"Tham gia lớp {class_doc.class_name} thành công!"}

@frappe.whitelist()
def leave_class(class_id):
    user = frappe.session.user
    if user == 'Guest':
        return {"success": False, "message": "Vui lòng đăng nhập."}
        
    class_doc = frappe.get_doc("FC Class", class_id)
    
    # Check if student is in class
    member_to_remove = None
    for member in class_doc.students:
        if member.student == user:
            member_to_remove = member
            break
            
    if not member_to_remove:
        return {"success": False, "message": "Bạn không có trong lớp học này."}
        
    class_doc.remove(member_to_remove)
    class_doc.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {"success": True, "message": "Đã rời khỏi lớp học thành công!"}

@frappe.whitelist()
def get_student_dashboard_data():
    user = frappe.session.user
    
    # 1. Active classes
    classes = frappe.db.sql("""
        SELECT c.name as id, c.class_name as name, c.teacher, u.full_name as teacher_name
        FROM `tabFC Class` c
        JOIN `tabFC Class Member` m ON m.parent = c.name
        LEFT JOIN `tabUser` u ON c.teacher = u.name
        WHERE m.student = %s AND c.status = 'Active'
    """, user, as_dict=True)
    
    class_ids = [c['id'] for c in classes]
    
    # 2. Upcoming exams
    upcoming_exams = []
    if class_ids:
        upcoming_exams = frappe.db.sql("""
            SELECT e.name as id, e.title, e.start_time, e.end_time, e.duration, e.class_ref, c.class_name
            FROM `tabFC Exam` e
            JOIN `tabFC Class` c ON e.class_ref = c.name
            WHERE e.class_ref IN %s AND e.status = 'Scheduled'
            ORDER BY e.start_time ASC
            LIMIT 50
        """, (tuple(class_ids),), as_dict=True)
        
    # 3. Notifications
    notifications = frappe.get_all("Notification Log", 
        filters={"for_user": user}, 
        fields=["name", "subject", "email_content as content", "creation", "read", "document_type", "document_name"],
        order_by="creation desc",
        limit=10
    )
    
    return {
        "success": True,
        "classes": classes,
        "upcoming_exams": upcoming_exams,
        "notifications": notifications
    }

@frappe.whitelist()
def mark_notification_read(notification_id):
    frappe.db.set_value("Notification Log", notification_id, "read", 1)
    frappe.db.commit()
    return {"success": True}

@frappe.whitelist()
def get_exam_details(exam_id):
    user = frappe.session.user
    exam = frappe.get_doc("FC Exam", exam_id)
    
    # Verify student is in class
    class_doc = frappe.get_doc("FC Class", exam.class_ref)
    if not any(m.student == user for m in class_doc.students):
        return {"success": False, "message": "Bạn không có quyền tham gia bài thi này."}
        
    # Check if exam is closed
    if exam.status == "Completed":
        return {"success": False, "message": "Bài thi này đã được giáo viên đóng. Không thể làm bài nữa."}
        
    # Check if already submitted
    attempts = frappe.db.count("FC Exam Result", filters={"exam_ref": exam_id, "student": user})
    max_attempts = getattr(exam, "max_attempts", 1)
    if max_attempts and attempts >= max_attempts:
        return {"success": False, "message": f"Bạn đã làm bài thi này {attempts}/{max_attempts} lần. Đã hết số lần cho phép."}
        
    # Mask correct_option before sending to student
    questions = []
    for q in exam.questions:
        questions.append({
            "id": q.name,
            "question_text": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
        })
        
    import random
    random.shuffle(questions)
        
    return {
        "success": True,
        "exam": {
            "id": exam.name,
            "title": exam.title,
            "duration": exam.duration,
            "start_time": exam.start_time,
            "end_time": exam.end_time
        },
        "questions": questions
    }

@frappe.whitelist()
def submit_exam(exam_id, answers, start_time=None):
    import json
    user = frappe.session.user
    
    if isinstance(answers, str):
        answers = json.loads(answers)
        
    exam = frappe.get_doc("FC Exam", exam_id)
    
    attempts = frappe.db.count("FC Exam Result", filters={"exam_ref": exam_id, "student": user})
    max_attempts = getattr(exam, "max_attempts", 1)
    if max_attempts and attempts >= max_attempts:
        return {"success": False, "message": f"Bạn đã làm bài thi này {attempts}/{max_attempts} lần. Không thể nộp thêm."}
    
    total_questions = len(exam.questions)
    correct_count = 0
    
    for q in exam.questions:
        student_ans = answers.get(q.name)
        if student_ans == q.correct_option:
            correct_count += 1
            
    score = round((correct_count / total_questions) * 10, 2) if total_questions > 0 else 0
    
    result = frappe.get_doc({
        "doctype": "FC Exam Result",
        "student": user,
        "exam_ref": exam_id,
        "class_ref": exam.class_ref,
        "total_questions": total_questions,
        "correct_answers": correct_count,
        "score": score,
        "submitted_at": frappe.utils.now(),
        "start_time": start_time,
        "answers": json.dumps(answers)
    })
    result.insert(ignore_permissions=True)
    frappe.db.commit()
    
    return {
        "success": True,
        "message": "Nộp bài thành công!",
        "score": score,
        "correct_answers": correct_count,
        "total_questions": total_questions
    }

@frappe.whitelist()
def get_class_members(class_id):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    
    # Allow teacher, admin or student in the class
    is_teacher_or_admin = (class_doc.teacher == user) or ("FC Admin" in frappe.get_roles(user))
    is_student = any((m.student or "").lower() == (user or "").lower() for m in class_doc.students)
    
    if not is_teacher_or_admin and not is_student:
        frappe.throw("Bạn không có quyền xem danh sách lớp.")
        
    students = []
    for member in class_doc.students:
        user_doc = frappe.get_doc("User", member.student)
        students.append({
            "email": member.student,
            "full_name": user_doc.full_name
        })
    return {"message": students}

@frappe.whitelist()
def get_class_messages(class_id):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    
    is_teacher_or_admin = (class_doc.teacher == user) or ("FC Admin" in frappe.get_roles(user))
    is_student = any((m.student or "").lower() == (user or "").lower() for m in class_doc.students)
    
    if not is_teacher_or_admin and not is_student:
        frappe.throw("Bạn không có quyền xem chat lớp.")
        
    messages = frappe.get_all(
        "FC Message",
        filters={"class_ref": class_id},
        fields=["name", "sender", "content", "timestamp", "creation"],
        order_by="creation asc"
    )
    
    for m in messages:
        m["sender_name"] = frappe.db.get_value("User", m.sender, "full_name") or m.sender
        
    return {"message": messages}

@frappe.whitelist()
def send_class_message(class_id, content):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    
    is_teacher_or_admin = (class_doc.teacher == user) or ("FC Admin" in frappe.get_roles(user))
    is_student = any((m.student or "").lower() == (user or "").lower() for m in class_doc.students)
    
    if not is_teacher_or_admin and not is_student:
        frappe.throw("Bạn không có quyền gửi tin nhắn.")
        
    doc = frappe.get_doc({
        "doctype": "FC Message",
        "class_ref": class_id,
        "sender": user,
        "content": content
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    
    return {"success": True}

@frappe.whitelist()
def get_student_exam_results(time_filter=None):
    user = frappe.session.user
    results = frappe.get_all(
        "FC Exam Result",
        filters={"student": user},
        fields=["name", "exam_ref", "class_ref", "score", "correct_answers", "total_questions", "submitted_at"],
        order_by="submitted_at asc"
    )
    
    from collections import defaultdict
    attempt_counters = defaultdict(int)
    
    # Setup filter date limit
    limit_date = None
    if time_filter and time_filter != 'all':
        from frappe.utils import add_days, add_years, getdate, today
        now_date = getdate(today())
        if time_filter == 'week':
            limit_date = add_days(now_date, -7)
        elif time_filter == 'month':
            limit_date = add_days(now_date, -30)
        elif time_filter == 'year':
            limit_date = add_years(now_date, -1)
    
    formatted_results = []
    for r in results:
        attempt_counters[r.exam_ref] += 1
        
        if limit_date:
            from frappe.utils import getdate
            if r.submitted_at and getdate(r.submitted_at) < getdate(limit_date):
                continue
                
        r["attempt_number"] = attempt_counters[r.exam_ref]
        r["exam_title"] = frappe.db.get_value("FC Exam", r.exam_ref, "title") or r.exam_ref
        r["class_name"] = frappe.db.get_value("FC Class", r.class_ref, "class_name") or r.class_ref
        formatted_results.append(r)
        
    # Reverse to show newest first
    formatted_results.reverse()
        
    return {"message": formatted_results}

@frappe.whitelist()
def get_student_overview():
    user = frappe.session.user
    
    # Lấy các lớp đang học
    joined_classes = frappe.db.sql("""
        SELECT c.name as id, c.class_name as name, c.price, c.teacher, u.full_name as teacher_name, c.image
        FROM `tabFC Class` c
        JOIN `tabFC Class Member` m ON m.parent = c.name
        LEFT JOIN `tabUser` u ON c.teacher = u.name
        WHERE m.student = %s AND c.status = 'Active'
    """, user, as_dict=True)
    
    joined_class_ids = [c["id"] for c in joined_classes]
    
    # Tính tổng học phí
    total_tuition = sum([int(c.get("price") or 0) for c in joined_classes])
    
    # Tính số bài kiểm tra đã hoàn thành
    exams_completed = frappe.db.count("FC Exam Result", filters={"student": user})
    
    # Lấy điểm số theo các bài kiểm tra đã nộp và tính trung bình theo tháng (để vẽ biểu đồ)
    exam_results = frappe.get_all("FC Exam Result", filters={"student": user}, fields=["score", "creation", "exam_ref"], order_by="creation asc")
    
    from collections import defaultdict
    monthly_scores = defaultdict(list)
    
    for er in exam_results:
        # er.creation is datetime
        month_label = f"T{er.creation.month}/{er.creation.year}"
        monthly_scores[month_label].append(er.score)
        
    score_growth = []
    for month, scores in monthly_scores.items():
        avg_score = round(sum(scores) / len(scores), 2)
        score_growth.append({
            "name": month,
            "score": avg_score
        })
        
    # Các lớp gợi ý (Chưa tham gia)
    if joined_class_ids:
        featured_classes = frappe.db.sql("""
            SELECT name as id, class_name as name, price, status, image, class_code
            FROM `tabFC Class`
            WHERE status = 'Active' AND name NOT IN %s
            ORDER BY creation DESC LIMIT 6
        """, (tuple(joined_class_ids),), as_dict=True)
    else:
        featured_classes = frappe.get_all("FC Class", filters={"status": "Active"}, fields=["name as id", "class_name as name", "price", "status", "image", "class_code"], limit=6, order_by="creation desc")
        
    # Format image field for featured classes
    for c in featured_classes:
        if not c.get("image"):
            c["image"] = "bg-gradient-to-br from-blue-500 to-cyan-500"
            c["imageIsUrl"] = False
        else:
            c["imageIsUrl"] = True

    # Tính tổng số token đã sử dụng của học sinh
    used_tokens_res = frappe.db.sql("""
        SELECT SUM(input_tokens + output_tokens)
        FROM `tabFC AI Token Usage`
        WHERE `user` = %s
    """, (user,))
    used_tokens = used_tokens_res[0][0] or 0 if used_tokens_res and used_tokens_res[0] else 0

    return {
        "success": True,
        "data": {
            "total_classes": len(joined_classes),
            "total_tuition": total_tuition,
            "exams_completed": exams_completed,
            "score_growth": score_growth,
            "featured_classes": featured_classes,
            "used_tokens": used_tokens
        }
    }

@frappe.whitelist()
def update_student_profile(full_name=None, gender=None, mobile_no=None, dob=None, cccd_number=None, new_password=None, avatar_data=None):
    user = frappe.session.user
    
    try:
        user_doc = frappe.get_doc("User", user)
        if full_name: 
            user_doc.first_name = full_name
            user_doc.last_name = ""
            user_doc.full_name = full_name
        if gender: user_doc.gender = gender
        if mobile_no: user_doc.mobile_no = mobile_no
        if dob: user_doc.birth_date = dob
        if cccd_number:
            # Only teachers need strict CCCD validation, but we keep it here just in case 
            pass
        
        if new_password:
            import re
            if len(new_password) < 8 or not re.search(r'[A-Za-z]', new_password) or not re.search(r'\d', new_password):
                frappe.throw(_("Mật khẩu phải dài ít nhất 8 ký tự, bao gồm cả chữ và số."))
            user_doc.new_password = new_password
            
        user_doc.save(ignore_permissions=True)
        if avatar_data:
            import os
            import time
            from frappe.utils.file_manager import save_file
            
            # Xử lý base64 image (vd: data:image/jpeg;base64,.....)
            if "," in avatar_data:
                avatar_data = avatar_data.split(",")[1]
                
            import base64
            file_content = base64.b64decode(avatar_data)
            
            # Xóa avatar cũ nếu có
            if user_doc.user_image:
                try:
                    file_name_doc = frappe.db.get_value("File", {"file_url": user_doc.user_image}, "name")
                    if file_name_doc:
                        frappe.delete_doc("File", file_name_doc, ignore_permissions=True)
                except:
                    pass
                    
            file_name = f"avatar_{user.split('@')[0]}_{int(time.time())}.jpg"
            saved_file = save_file(file_name, file_content, "User", user, decode=False, is_private=0)
            frappe.db.set_value("User", user, "user_image", saved_file.file_url)
            
        frappe.db.commit()
        return {"success": True, "message": "Cập nhật hồ sơ thành công."}
    except Exception as e:
        frappe.log_error(title="Profile Update Error", message=frappe.get_traceback())
        return {"success": False, "message": str(e)}

@frappe.whitelist()
def get_teacher_exams():
    user = frappe.session.user
    classes = frappe.get_all("FC Class", filters={"teacher": user}, fields=["name", "class_name"])
    if not classes:
        return {"success": True, "message": []}
        
    class_ids = [c.name for c in classes]
    class_map = {c.name: c.class_name for c in classes}
    
    exams = frappe.get_all(
        "FC Exam",
        filters={"class_ref": ("in", class_ids)},
        fields=["name", "title", "class_ref", "duration", "start_time", "end_time", "creation", "max_attempts", "status"],
        order_by="creation desc"
    )
    
    for e in exams:
        e["class_name"] = class_map.get(e.class_ref)
        
        # Load questions for each exam
        q_docs = frappe.get_all(
            "FC Question", 
            filters={"parent": e["name"]}, 
            fields=["name", "question_text", "option_a", "option_b", "option_c", "option_d", "correct_option"]
        )
        e["questions"] = q_docs
        
    return {"success": True, "message": exams}

@frappe.whitelist()
def get_exam_results_for_teacher(exam_id):
    user = frappe.session.user
    
    exam = frappe.get_doc("FC Exam", exam_id)
    class_doc = frappe.get_doc("FC Class", exam.class_ref)
    
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền xem kết quả bài thi này."}
        
    results = frappe.get_all(
        "FC Exam Result",
        filters={"exam_ref": exam_id},
        fields=["name", "student", "score", "correct_answers", "total_questions", "creation"],
        order_by="score desc"
    )
    
    for r in results:
        r["student_name"] = frappe.db.get_value("User", r.student, "full_name") or r.student
        
    return {"success": True, "message": results}

@frappe.whitelist()
def get_exam_result_detail(result_id):
    user = frappe.session.user
    result = frappe.get_doc("FC Exam Result", result_id)
    
    exam = frappe.get_doc("FC Exam", result.exam_ref)
    class_doc = frappe.get_doc("FC Class", exam.class_ref)
    
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user) and result.student != user:
        return {"success": False, "message": "Không có quyền xem kết quả này."}
        
    import json
    answers = {}
    if result.answers:
        try:
            answers = json.loads(result.answers)
        except:
            pass
            
    questions = []
    for q in exam.questions:
        questions.append({
            "id": q.name,
            "question_text": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "correct_option": q.correct_option,
            "student_answer": answers.get(q.name)
        })
        
    return {
        "success": True,
        "message": {
            "result_id": result.name,
            "student": result.student,
            "student_name": frappe.db.get_value("User", result.student, "full_name") or result.student,
            "score": result.score,
            "start_time": getattr(result, "start_time", None),
            "submitted_at": result.creation,
            "questions": questions
        }
    }


@frappe.whitelist()
def save_exam_to_bank(title, duration, questions):
    """Save an exam (manual or from AI) to the exam bank."""
    user = frappe.session.user
    if "FC Teacher" not in frappe.get_roles(user) and "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền"}

    if isinstance(questions, str):
        questions = json.loads(questions)
    duration = int(duration) if duration else 45

    # We need a class_ref (required field in FC Exam). Use a placeholder or the teacher's first class.
    class_ref = frappe.db.get_value("FC Class", {"teacher": user}, "name")
    if not class_ref:
        return {"success": False, "message": "Bạn chưa có lớp nào. Vui lòng tạo lớp trước."}

    exam = frappe.get_doc({
        "doctype": "FC Exam",
        "title": title,
        "class_ref": class_ref,
        "duration": duration,
        "questions": []
    })

    for q in questions:
        exam.append("questions", {
            "question_text": q.get("question_text", ""),
            "option_a": q.get("option_a", ""),
            "option_b": q.get("option_b", ""),
            "option_c": q.get("option_c", ""),
            "option_d": q.get("option_d", ""),
            "correct_option": q.get("correct_option", "A"),
        })

    exam.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"success": True, "message": "Đề thi đã được lưu vào kho!", "data": {"name": exam.name}}


@frappe.whitelist()
def delete_exam_from_bank(exam_name):
    """Delete an exam from the exam bank."""
    user = frappe.session.user
    exam = frappe.get_doc("FC Exam", exam_name)
    
    if "FC Admin" not in frappe.get_roles(user):
        class_teacher = frappe.db.get_value("FC Class", exam.class_ref, "teacher")
        if class_teacher != user:
            return {"success": False, "message": "Không có quyền xóa đề thi này"}
    
    frappe.delete_doc("FC Exam", exam_name, ignore_permissions=True, force=True)
    frappe.db.commit()
    return {"success": True, "message": "Đã xóa đề thi thành công!"}


@frappe.whitelist()
def update_exam_in_bank(exam_name, title, duration, questions):
    """Update an existing exam in the exam bank."""
    user = frappe.session.user
    
    if isinstance(questions, str):
        questions = json.loads(questions)
    duration = int(duration) if duration else 45
    
    exam = frappe.get_doc("FC Exam", exam_name)
    
    if "FC Admin" not in frappe.get_roles(user):
        class_teacher = frappe.db.get_value("FC Class", exam.class_ref, "teacher")
        if class_teacher != user:
            return {"success": False, "message": "Không có quyền sửa đề thi này"}
    
    exam.title = title
    exam.duration = duration
    exam.questions = []
    
    for q in questions:
        exam.append("questions", {
            "question_text": q.get("question_text", ""),
            "option_a": q.get("option_a", ""),
            "option_b": q.get("option_b", ""),
            "option_c": q.get("option_c", ""),
            "option_d": q.get("option_d", ""),
            "correct_option": q.get("correct_option", "A"),
        })
    
    exam.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {"success": True, "message": "Đề thi đã được cập nhật!", "data": {"name": exam.name}}

def _is_eligible_for_upgrade_discount(user):
    # Check if user has any previous successful Normal order
    has_normal_order = frappe.db.exists(
        "FC AI Subscription Order",
        {"teacher": user, "status": ["in", ["Paid", "Approved"]], "package_type": ["in", ["Monthly", "Yearly"]]}
    )
    if has_normal_order:
        return True
    
    # Or if their current package type is Normal
    user_doc = frappe.db.get_value("User", user, ["custom_ai_package_type"], as_dict=True)
    if user_doc and user_doc.get("custom_ai_package_type") == "Normal":
        return True
        
    return False

@frappe.whitelist()
def get_subscription_status():
    user = frappe.session.user
    access = _get_ai_access(user)
    
    user_doc = frappe.get_doc("User", user)
    expiration_date = user_doc.get("custom_ai_expiration_date")
    
    from frappe.utils import getdate, today, date_diff
    days_left = 0
    if expiration_date and getdate(expiration_date) >= getdate(today()):
        days_left = date_diff(expiration_date, today())
        
    return {
        "success": True,
        "active": access.get("is_subscribed", False) and access.get("allowed", False),
        "is_active": access.get("is_subscribed", False) and access.get("allowed", False),
        "package_type": access.get("package_type") or None,
        "expire_date": expiration_date,
        "expiration_date": expiration_date,
        "days_left": days_left,
        "trial_limit": AI_TRIAL_MESSAGE_LIMIT,
        "trial_used": access.get("trial_used", 0),
        "trial_remaining": access.get("trial_remaining", 0),
        "eligible_for_upgrade_discount": _is_eligible_for_upgrade_discount(user),
        "total_tokens": access.get("token_limit", 0),
        "tokens_left": max(access.get("token_limit", 0) - access.get("token_used", 0), 0)
    }

@frappe.whitelist()
def create_subscription_order(package_type=None, teacherId=None, packageId=None, amount=None):
    try:
        user = frappe.session.user
        if teacherId and teacherId != user and "FC Admin" not in frappe.get_roles(user):
            return {"success": False, "message": "Khong co quyen tao don cho giao vien khac."}
        teacher = teacherId or user
        package_type = package_type or packageId
        if package_type not in ["Monthly", "Yearly", "Pro_Monthly", "Pro_Yearly"] and not str(package_type).startswith("Custom_"):
            return {"success": False, "message": "Goi khong hop le."}
            
        prices = {
            "Monthly": 199000,
            "Yearly": 1099000,
            "Pro_Monthly": 398000,
            "Pro_Yearly": 2198000
        }
        
        if package_type in prices:
            expected_amount = prices[package_type]
            if package_type in ["Pro_Monthly", "Pro_Yearly"] and _is_eligible_for_upgrade_discount(teacher):
                expected_amount = int(expected_amount * 0.75)
        else:
            expected_amount = 0
            
        if isinstance(amount, str):
            import re
            amount_str = re.sub(r'[^\d]', '', amount)
            amount = int(amount_str) if amount_str else 0
        elif amount is not None:
            amount = int(amount)
        else:
            amount = 0
            
        amount = amount or expected_amount
        if package_type in prices:
            base_amount = prices[package_type]
            discounted_amount = int(base_amount * 0.75) if package_type in ["Pro_Monthly", "Pro_Yearly"] and _is_eligible_for_upgrade_discount(teacher) else base_amount
            if amount not in [base_amount, discounted_amount]:
                return {"success": False, "message": "So tien khong khop voi goi dang ky."}
        
        order_data = {
            "doctype": "FC AI Subscription Order",
            "teacher": teacher,
            "package_type": "Monthly" if str(package_type).startswith("Custom_") else package_type,
            "amount": amount,
            "status": "Pending"
        }
        if _has_doctype_field("FC AI Subscription Order", "payment_gateway"):
            order_data["payment_gateway"] = "VNPAY"

        order = frappe.get_doc(order_data)
        order.insert(ignore_permissions=True, ignore_mandatory=True)
        if str(package_type).startswith("Custom_"):
            order.db_set("package_type", package_type)
            order.package_type = package_type
        order.db_set("order_code", order.name)

        cfg = _get_vnpay_config()
        now = datetime.now()
        client_ip = frappe.local.request_ip or "127.0.0.1"
        vnp_params = {
            "vnp_Version": "2.1.0",
            "vnp_Command": "pay",
            "vnp_TmnCode": cfg["tmn_code"],
            "vnp_Amount": amount * 100,
            "vnp_CurrCode": "VND",
            "vnp_TxnRef": order.name,
            "vnp_OrderInfo": f"Thanh toan goi AI {package_type} cho {teacher}",
            "vnp_OrderType": "other",
            "vnp_Locale": "vn",
            "vnp_ReturnUrl": cfg["return_url"],
            "vnp_IpAddr": client_ip,
            "vnp_CreateDate": now.strftime("%Y%m%d%H%M%S"),
        }
        secure_hash = _vnpay_hash(vnp_params, cfg["hash_secret"])
        query = _vnpay_sign_data(vnp_params)
        payment_url = f"{cfg['pay_url']}?{query}&vnp_SecureHash={secure_hash}"
        frappe.db.commit()
        
        return {
            "success": True,
            "order_code": order.name,
            "amount": amount,
            "payment_url": payment_url
        }
    except Exception as e:
        import traceback
        return {"success": False, "message": f"Loi he thong: {str(e)}"}

@frappe.whitelist()
def test_ai_subscription_payment(package_type=None, packageId=None, amount=None, bank_account=None, card_holder=None, issue_date=None, otp=None):
    user = frappe.session.user
    package_type = package_type or packageId
    if package_type not in ["Monthly", "Yearly", "Pro_Monthly", "Pro_Yearly"] and not str(package_type).startswith("Custom_"):
        return {"success": False, "message": "Goi khong hop le."}

    prices = {
        "Monthly": 199000,
        "Yearly": 1099000,
        "Pro_Monthly": 398000,
        "Pro_Yearly": 2198000
    }
    if package_type in prices:
        expected_amount = prices[package_type]
        if package_type in ["Pro_Monthly", "Pro_Yearly"] and _is_eligible_for_upgrade_discount(user):
            expected_amount = int(expected_amount * 0.75)
    else:
        expected_amount = 0
        
    if isinstance(amount, str):
        import re
        amount_str = re.sub(r'[^\d]', '', amount)
        amount = int(amount_str) if amount_str else 0
    elif amount is not None:
        amount = int(amount)
    else:
        amount = 0
        
    amount = amount or expected_amount
    if package_type in prices:
        base_amount = prices[package_type]
        discounted_amount = int(base_amount * 0.75) if package_type in ["Pro_Monthly", "Pro_Yearly"] and _is_eligible_for_upgrade_discount(user) else base_amount
        if amount not in [base_amount, discounted_amount]:
            return {"success": False, "message": "So tien khong khop voi goi dang ky."}

    bank_account = (bank_account or "").strip()
    card_holder = (card_holder or "").strip().upper()
    issue_date = (issue_date or "").strip()
    otp = (otp or "").strip()

    if bank_account != "9704198526191432198":
        return {"success": False, "message": "So the test khong dung. Vui long dung the NCB mau."}
    if card_holder != "NGUYEN VAN A":
        return {"success": False, "message": "Ten chu the test khong dung."}
    if issue_date != "07/15":
        return {"success": False, "message": "Ngay phat hanh test khong dung."}
    if otp != "123456":
        return {"success": False, "message": "OTP test khong dung."}

    order_data = {
        "doctype": "FC AI Subscription Order",
        "teacher": user,
        "package_type": "Monthly" if str(package_type).startswith("Custom_") else package_type,
        "amount": amount,
        "status": "Paid"
    }
    if _has_doctype_field("FC AI Subscription Order", "payment_gateway"):
        order_data["payment_gateway"] = "TEST_BANK"
    if _has_doctype_field("FC AI Subscription Order", "vnp_transaction_no"):
        order_data["vnp_transaction_no"] = f"TEST-{frappe.generate_hash(length=10).upper()}"
    if _has_doctype_field("FC AI Subscription Order", "vnp_response_code"):
        order_data["vnp_response_code"] = "00"
    if _has_doctype_field("FC AI Subscription Order", "vnp_transaction_status"):
        order_data["vnp_transaction_status"] = "00"

    order = frappe.get_doc(order_data)
    order.insert(ignore_permissions=True, ignore_mandatory=True)
    if str(package_type).startswith("Custom_"):
        order.db_set("package_type", package_type)
        order.package_type = package_type
    order.db_set("order_code", order.name)

    from frappe.utils import now_datetime
    paid_at = now_datetime()
    if _has_doctype_field("FC AI Subscription Order", "paid_at"):
        order.db_set("paid_at", paid_at)
    order.db_set("payment_date", paid_at)
    _activate_ai_subscription(order)
    frappe.db.commit()

    return {
        "success": True,
        "message": "Thanh toan test thanh cong. Goi AI da duoc kich hoat.",
        "order_code": order.name,
        "amount": amount,
        "status": "Paid"
    }

@frappe.whitelist(allow_guest=True)
def vnpay_return(**kwargs):
    params = dict(kwargs or frappe.form_dict)
    cfg = _get_vnpay_config()
    received_hash = params.get("vnp_SecureHash")
    expected_hash = _vnpay_hash(params, cfg["hash_secret"])
    expected_hash_plus = _vnpay_hash(params, cfg["hash_secret"], quote_via=urllib.parse.quote_plus)

    valid_hashes = {expected_hash.lower(), expected_hash_plus.lower()}
    if not received_hash or received_hash.lower() not in valid_hashes:
        return {"success": False, "message": "Chu ky VNPAY khong hop le.", "code": "INVALID_SIGNATURE"}

    order_id = params.get("vnp_TxnRef")
    if not order_id or not frappe.db.exists("FC AI Subscription Order", order_id):
        return {"success": False, "message": "Khong tim thay don hang.", "code": "ORDER_NOT_FOUND"}

    order = frappe.get_doc("FC AI Subscription Order", order_id)
    response_code = params.get("vnp_ResponseCode")
    transaction_status = params.get("vnp_TransactionStatus")
    transaction_no = params.get("vnp_TransactionNo")

    if _has_doctype_field("FC AI Subscription Order", "vnp_response_code"):
        order.db_set("vnp_response_code", response_code)
    if _has_doctype_field("FC AI Subscription Order", "vnp_transaction_status"):
        order.db_set("vnp_transaction_status", transaction_status)
    if _has_doctype_field("FC AI Subscription Order", "vnp_transaction_no"):
        order.db_set("vnp_transaction_no", transaction_no)
    if _has_doctype_field("FC AI Subscription Order", "payment_gateway"):
        order.db_set("payment_gateway", "VNPAY")

    if response_code == "00" and transaction_status == "00":
        if order.status != "Paid":
            from frappe.utils import now_datetime
            order.db_set("status", "Paid")
            now = now_datetime()
            if _has_doctype_field("FC AI Subscription Order", "paid_at"):
                order.db_set("paid_at", now)
                order.db_set("payment_date", now)
            else:
                order.db_set("payment_date", now)
            _activate_ai_subscription(order)
        success = True
        message = "Thanh toan thanh cong. Goi AI da duoc kich hoat."
    else:
        order.db_set("status", "Failed")
        success = False
        message = "Thanh toan that bai hoac da bi huy."

    frappe.db.commit()
    return {
        "success": success,
        "message": message,
        "order_code": order.name,
        "status": order.status,
        "vnp_transaction_no": transaction_no,
        "vnp_response_code": response_code
    }

@frappe.whitelist()
def get_class_gradebook(class_id):
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    roles = frappe.get_roles(user)
    
    if class_doc.teacher != user and "FC Admin" not in roles:
        frappe.throw(_("Bạn không có quyền xem bảng điểm của lớp học này!"))
        
    students = []
    for member in class_doc.students:
        user_doc = frappe.get_doc("User", member.student)
        students.append({
            "email": member.student,
            "full_name": user_doc.full_name
        })
        
    exams = frappe.get_all("FC Exam", filters={"class_ref": class_id}, fields=["name", "title"])
    exam_names = [e["name"] for e in exams]
    
    grades = {}
    if exam_names and students:
        student_emails = [s["email"] for s in students]
        submissions = frappe.get_all(
            "FC Submission",
            filters={
                "exam_ref": ["in", exam_names],
                "student": ["in", student_emails]
            },
            fields=["exam_ref", "student", "score"]
        )
        
        for sub in submissions:
            student = sub["student"]
            exam = sub["exam_ref"]
            score = sub["score"]
            
            if student not in grades:
                grades[student] = {}
            if exam not in grades[student] or score > grades[student][exam]:
                grades[student][exam] = score
                
    return {
        "success": True,
        "students": students,
        "exams": exams,
        "grades": grades
    }

def get_local_filepath(link_url):
    if not link_url:
        return None
    if link_url.startswith("/files/"):
        filename = link_url.replace("/files/", "", 1)
        return frappe.get_site_path("public", "files", filename)
    elif link_url.startswith("/private/files/"):
        filename = link_url.replace("/private/files/", "", 1)
        return frappe.get_site_path("private", "files", filename)
    return None

def fetch_webpage_content(url):
    try:
        import requests
        import re
        headers = {"User-Agent": "Mozilla/5.0"}
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            text = re.sub(r'<script.*?</script>', '', res.text, flags=re.DOTALL)
            text = re.sub(r'<style.*?</style>', '', text, flags=re.DOTALL)
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text).strip()
            return text[:20000]
    except Exception:
        pass
    return None

@frappe.whitelist()
def chat_about_document(document_id, question, chat_history=None):
    user = frappe.session.user
    limit_check = _check_token_limit(user)
    if not limit_check["success"]:
        return limit_check
        
    doc = frappe.get_doc("FC Document", document_id)
    class_doc = frappe.get_doc("FC Class", doc.class_ref)
    roles = frappe.get_roles(user)
    is_teacher = class_doc.teacher == user
    is_student = any((member.student or "").lower() == (user or "").lower() for member in class_doc.students)
    is_admin = "FC Admin" in roles
    
    if not (is_admin or is_teacher or is_student):
        frappe.throw(_("Bạn không có quyền truy cập tài liệu này!"))
    
    api_key = _get_gemini_api_key()
    if not api_key:
        return {
            "success": False,
            "message": "Hệ thống chưa cấu hình Gemini API Key. Vui lòng liên hệ Admin."
        }
        
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    
    history_list = []
    if chat_history:
        try:
            history_list = json.loads(chat_history)
        except:
            pass
            
    system_instruction = f"""Bạn là FlyingClass AI, trợ lý học tập của lớp học "{class_doc.class_name}".
    Bạn đang hỗ trợ học sinh thảo luận và trả lời các câu hỏi về tài liệu: "{doc.document_name}".
    Hãy luôn tập trung trả lời dựa trên nội dung tài liệu này. Thân thiện, dễ hiểu, súc tích và sử dụng Tiếng Việt."""
    
    model = genai.GenerativeModel(model_name=FLYINGCLASS_AI_MODEL, system_instruction=system_instruction)
    
    local_file = None
    if doc.link_url:
        if doc.link_url.startswith("/files/") or doc.link_url.startswith("/private/files/"):
            local_file = get_local_filepath(doc.link_url)
            
    uploaded_gemini_file = None
    web_content = ""
    
    if local_file and os.path.exists(local_file):
        try:
            uploaded_gemini_file = genai.upload_file(local_file)
        except Exception as e:
            web_content = f"\n[Lỗi tải file: {str(e)}]"
    elif doc.link_url and doc.link_url.startswith("http"):
        web_content = fetch_webpage_content(doc.link_url)
        if web_content:
            web_content = f"\n\nNội dung được trích xuất từ tài liệu:\n{web_content}"
        else:
            web_content = f"\n\nTài liệu liên kết đến trang: {doc.link_url}"
            
    user_prompt = f"Câu hỏi về tài liệu '{doc.document_name}': {question}"
    if web_content:
        user_prompt += web_content
        
    chat_session = model.start_chat()
    for msg in history_list:
        chat_session.history.append(
            genai.types.Content(
                role="user" if msg["role"] == "user" else "model",
                parts=[genai.types.Part.from_text(text=msg["text"])]
            )
        )
        
    if uploaded_gemini_file:
        response = chat_session.send_message([uploaded_gemini_file, user_prompt])
    else:
        response = chat_session.send_message(user_prompt)
        
    _consume_ai_trial_message(user)
    
    try:
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = response.usage_metadata
            frappe.get_doc({
                "doctype": "FC AI Token Usage",
                "model": FLYINGCLASS_AI_MODEL,
                "input_tokens": getattr(usage, "prompt_token_count", 0) or 0,
                "output_tokens": getattr(usage, "candidates_token_count", 0) or 0,
                "action": "Doc Chat",
                "user": user
            }).insert(ignore_permissions=True)
            frappe.db.commit()
    except Exception as e:
        frappe.log_error("AI Token Logging Error", str(e))
        
    return {
        "success": True,
        "reply": response.text
    }

@frappe.whitelist()
def ask_flyingclass_ai(question, chat_history=None):
    user = frappe.session.user
    if user == 'Guest':
        return {"success": False, "message": "Vui lòng đăng nhập."}
        
    if not question:
        return {"success": False, "message": "Vui lòng nhập câu hỏi."}
        
    limit_check = _check_token_limit(user)
    if not limit_check["success"]:
        return limit_check
    
    # Calculate current token usage for response info
    used_tokens_res = frappe.db.sql("""
        SELECT SUM(input_tokens + output_tokens)
        FROM `tabFC AI Token Usage`
        WHERE `user` = %s
    """, (user,))
    used_tokens = int(used_tokens_res[0][0] or 0) if used_tokens_res and used_tokens_res[0] else 0
        
    api_key = _get_gemini_api_key()
    if not api_key:
        return {
            "success": False,
            "message": "Hệ thống chưa cấu hình Gemini API Key trong FC AI Settings. Vui lòng liên hệ Admin."
        }
        
    system_instruction = """Bạn là FlyingClass AI, trợ lý học tập trực tuyến thông minh độc quyền của hệ thống FlyingClass.
    Hãy luôn thân thiện, nhiệt tình, giải đáp các câu hỏi học tập ngắn gọn, dễ hiểu bằng Tiếng Việt.
    TUYỆT ĐỐI KHÔNG TIẾT LỘ bạn được phát triển bởi Google hay bất kỳ tổ chức nào ngoài FlyingClass."""
    
    # Parse chat history if any
    history = []
    if chat_history:
        try:
            import json
            history = json.loads(chat_history)
        except Exception:
            pass
            
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name=FLYINGCLASS_AI_MODEL,
            system_instruction=system_instruction
        )
        
        # Convert history format for Gemini chat
        gemini_history = []
        for msg in history:
            role = "model" if msg.get("role") == "assistant" else msg.get("role", "user")
            text = msg.get("text", "")
            if text and role in ("user", "model"):
                gemini_history.append({"role": role, "parts": [text]})
        
        chat = model.start_chat(history=gemini_history)
        gemini_response = chat.send_message(question)
        reply = gemini_response.text
        
        # Log tokens used
        input_tokens = 0
        output_tokens = 0
        try:
            usage = getattr(gemini_response, "usage_metadata", None)
            if usage:
                input_tokens = getattr(usage, "prompt_token_count", 0) or 0
                output_tokens = getattr(usage, "candidates_token_count", 0) or 0
            
            frappe.get_doc({
                "doctype": "FC AI Token Usage",
                "model": FLYINGCLASS_AI_MODEL,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "action": "Box Chat QA",
                "user": user
            }).insert(ignore_permissions=True)
            frappe.db.commit()
        except Exception:
            pass
            
        return {
            "success": True,
            "reply": reply,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens_used": used_tokens + input_tokens + output_tokens
        }
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "ResourceExhausted" in err_str or "quota" in err_str.lower():
            _consume_ai_trial_message(user)
            return {
                "success": True,
                "reply": "⚠️ **[MOCK DATA]** API Key Gemini của hệ thống đã vượt giới hạn quota từ Google (lỗi 429). Đây là câu trả lời giả lập từ hệ thống để bạn có thể tiếp tục xem và test giao diện bình thường nhé!",
                "input_tokens": 10,
                "output_tokens": 20,
                "total_tokens_used": 30
            }
        if "401" in err_str or "403" in err_str or "INVALID_ARGUMENT" in err_str or "API_KEY_INVALID" in err_str:
            return {
                "success": False,
                "code": "AI_INVALID_KEY",
                "message": "⚠️ API Key Gemini không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ Admin để cập nhật."
            }
        return {
            "success": False,
            "message": f"Có lỗi xảy ra khi gọi FlyingClass AI: {err_str}"
        }


@frappe.whitelist()
def get_course_outline(class_id):
    """
    Trả về danh sách các chương và bài học, cùng với trạng thái khóa/mở của học sinh.
    """
    user = frappe.session.user
    class_doc = frappe.get_doc("FC Class", class_id)
    roles = frappe.get_roles(user)
    is_teacher = class_doc.teacher == user
    is_student = any((m.student or "").lower() == (user or "").lower() for m in class_doc.students)
    is_admin = "FC Admin" in roles

    if not (is_admin or is_teacher or is_student):
        frappe.throw(_("Bạn không có quyền xem lớp học này!"))

    # Fetch chapters
    chapters = frappe.get_all("FC Chapter", filters={"class_ref": class_id}, fields=["name", "chapter_name", "order_idx", "description"], order_by="order_idx asc")
    
    # Fetch lessons
    lessons = frappe.get_all("FC Lesson", filters={"class_ref": class_id}, fields=["name", "title", "video_url", "document_url", "chapter_ref", "order_idx"], order_by="order_idx asc")
    
    # Fetch documents for lessons
    documents = frappe.get_all("FC Document", filters={"class_ref": class_id}, fields=["name", "document_name", "doc_type", "parent_folder", "link_url", "lesson_ref"], order_by="creation asc")
    
    # Fetch chapter tests
    chapter_tests = frappe.get_all("FC Chapter Test", fields=["name", "title", "chapter_ref", "pass_score", "status"])
    test_dict = {t.chapter_ref: t for t in chapter_tests}
    
    # Fetch progress for student
    progress_dict = {}
    if is_student and not is_teacher and not is_admin:
        progress_records = frappe.get_all("FC Chapter Progress", filters={"student": user, "class_ref": class_id}, fields=["chapter_ref", "is_passed", "test_score"])
        for p in progress_records:
            progress_dict[p.chapter_ref] = p

    # Fetch questions for tests so frontend can render them
    for t_ref, t_doc in test_dict.items():
        doc = frappe.get_doc("FC Chapter Test", t_doc.name)
        t_doc["questions"] = []
        for q in doc.questions:
            q_dict = {
                "name": q.name,
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d
            }
            if is_teacher or is_admin:
                q_dict["correct_option"] = q.correct_option
            t_doc["questions"].append(q_dict)

    outline = []
    is_locked = False

    for i, chap in enumerate(chapters):
        chap_lessons = []
        for l in lessons:
            if l.chapter_ref == chap.name:
                # Attach documents to this lesson
                l_docs = [d for d in documents if d.lesson_ref == l.name]
                l.documents = l_docs
                chap_lessons.append(l)
        chap_test = test_dict.get(chap.name)
        chap_progress = progress_dict.get(chap.name)
        
        passed = chap_progress.is_passed if chap_progress else 0
        score = chap_progress.test_score if chap_progress else None

        # Logic mở khóa: 
        # Chương đầu tiên luôn mở (nếu chưa bị khóa từ chương trước).
        # Nếu chương N có bài test mà học sinh chưa pass, thì chương N+1 sẽ bị khóa.
        current_locked = is_locked
        if is_teacher or is_admin:
            current_locked = False
            
        chap_info = {
            "id": chap.name,
            "chapter_name": chap.chapter_name,
            "order_idx": chap.order_idx,
            "description": chap.description,
            "lessons": chap_lessons,
            "test": chap_test,
            "is_locked": current_locked,
            "passed": passed,
            "score": score
        }
        outline.append(chap_info)

        # Cập nhật trạng thái khóa cho chương tiếp theo
        if chap_test and not passed:
            is_locked = True
            
    return {"chapters": outline}

@frappe.whitelist()
def submit_chapter_test(test_id, answers):
    user = frappe.session.user
    answers_dict = json.loads(answers) if isinstance(answers, str) else answers
    
    test_doc = frappe.get_doc("FC Chapter Test", test_id)
    class_id = frappe.db.get_value("FC Chapter", test_doc.chapter_ref, "class_ref")
    
    total_questions = len(test_doc.questions)
    correct_count = 0
    
    for q in test_doc.questions:
        student_answer = answers_dict.get(q.name)
        if student_answer and q.correct_option and student_answer.lower() == q.correct_option.lower():
            correct_count += 1
            
    is_passed = 1 if correct_count >= test_doc.pass_score else 0
    score = (correct_count / total_questions) * 10 if total_questions > 0 else 0
    
    # Check if progress exists
    existing = frappe.get_all("FC Chapter Progress", filters={"student": user, "chapter_ref": test_doc.chapter_ref}, limit=1)
    
    if existing:
        prog_doc = frappe.get_doc("FC Chapter Progress", existing[0].name)
        # Chỉ cập nhật nếu điểm mới cao hơn, hoặc nếu học sinh chuyển từ fail sang pass
        if is_passed or score > prog_doc.test_score:
            prog_doc.test_score = score
            prog_doc.is_passed = 1 if (prog_doc.is_passed or is_passed) else 0
            prog_doc.save(ignore_permissions=True)
    else:
        prog_doc = frappe.get_doc({
            "doctype": "FC Chapter Progress",
            "student": user,
            "class_ref": class_id,
            "chapter_ref": test_doc.chapter_ref,
            "test_score": score,
            "is_passed": is_passed
        })
        prog_doc.insert(ignore_permissions=True)
        
    return {
        "success": True,
        "score": score,
        "correct_count": correct_count,
        "total_questions": total_questions,
        "is_passed": is_passed,
        "message": "Chúc mừng! Bạn đã qua bài kiểm tra." if is_passed else "Rất tiếc, bạn chưa đạt đủ điểm để qua chương."
    }

@frappe.whitelist()
def get_student_learning_progress(class_id):
    user = frappe.session.user
    
    # Check if student is in class
    class_doc = frappe.get_doc("FC Class", class_id)
    is_student = any((m.student or "").lower() == (user or "").lower() for m in class_doc.students)
    if not is_student and "FC Admin" not in frappe.get_roles(user) and class_doc.teacher != user:
        frappe.throw("Bạn không có quyền xem tiến độ của lớp này")
        
    chapters = frappe.get_all("FC Chapter", filters={"class_ref": class_id}, fields=["name"])
    total_chapters = len(chapters)
    
    if total_chapters == 0:
        return {"success": True, "progress_percent": 0, "passed_chapters": 0, "total_chapters": 0}
        
    chapter_names = [c.name for c in chapters]
    passed_progress = frappe.get_all(
        "FC Chapter Progress", 
        filters={"student": user, "class_ref": class_id, "chapter_ref": ["in", chapter_names], "is_passed": 1},
        fields=["name"]
    )
    
    passed_count = len(passed_progress)
    progress_percent = int((passed_count / total_chapters) * 100)
    
    return {
        "success": True,
        "progress_percent": progress_percent,
        "passed_chapters": passed_count,
        "total_chapters": total_chapters
    }

@frappe.whitelist()
def create_lesson_api(title, class_ref, chapter_ref, video_url="", document_url="", order_idx=1):
    """Create a lesson - whitelisted method to bypass Frappe REST permission issues"""
    user = frappe.session.user
    
    # Verify the teacher owns this class
    class_doc = frappe.get_doc("FC Class", class_ref)
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user):
        frappe.throw("Bạn không có quyền tạo bài học cho lớp này", frappe.PermissionError)
    
    doc = frappe.get_doc({
        "doctype": "FC Lesson",
        "title": title,
        "class_ref": class_ref,
        "chapter_ref": chapter_ref,
        "video_url": video_url or "",
        "document_url": document_url or "",
        "order_idx": int(order_idx)
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return doc.as_dict()


@frappe.whitelist()
def delete_lesson_api(lesson_name):
    """Delete a lesson - whitelisted method to bypass Frappe REST permission issues"""
    user = frappe.session.user
    
    lesson_doc = frappe.get_doc("FC Lesson", lesson_name)
    class_doc = frappe.get_doc("FC Class", lesson_doc.class_ref)
    if class_doc.teacher != user and "FC Admin" not in frappe.get_roles(user):
        frappe.throw("Bạn không có quyền xóa bài học này", frappe.PermissionError)
    
    frappe.delete_doc("FC Lesson", lesson_name, ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}

@frappe.whitelist()
def get_token_usage_history(days=7):
    user = frappe.session.user
    
    # Query to group token usage by date
    history_raw = frappe.db.sql("""
        SELECT DATE(creation) as date, SUM(input_tokens + output_tokens) as total
        FROM `tabFC AI Token Usage`
        WHERE user = %s AND creation >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
        GROUP BY DATE(creation)
        ORDER BY DATE(creation) ASC
    """, (user, int(days)), as_dict=True)
    
    import datetime
    today = datetime.date.today()
    
    data_dict = {str(item.date): int(item.total or 0) for item in history_raw}
    
    result = []
    for i in range(int(days)-1, -1, -1):
        d = today - datetime.timedelta(days=i)
        d_str = str(d)
        result.append({
            "date": d.strftime("%d/%m"),
            "tokens": data_dict.get(d_str, 0)
        })
        
    return {
        "success": True,
        "data": result
    }
