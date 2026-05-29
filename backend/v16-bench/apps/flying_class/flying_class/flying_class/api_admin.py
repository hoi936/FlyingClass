import frappe
from frappe import _

@frappe.whitelist()
def get_admin_stats(filter_type="week"):
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Không có quyền truy cập"), frappe.PermissionError)

    total_students = frappe.db.count("User", {"name": ("in", frappe.get_all("Has Role", filters={"role": "FC Student"}, pluck="parent"))})
    total_teachers = frappe.db.count("User", {"name": ("in", frappe.get_all("Has Role", filters={"role": "FC Teacher"}, pluck="parent"))})
    total_classes = frappe.db.count("FC Class")

    from frappe.utils import add_days, add_months, getdate, formatdate
    today = getdate()
    
    growthData = []
    
    if filter_type == "week":
        # Last 7 days
        days = [add_days(today, -i) for i in range(6, -1, -1)]
        start_date = days[0]
        for d in days:
            label = formatdate(d, "dd/MM")
            # Count users created on this day
            students = frappe.db.count("User", filters={"creation": ("between", [f"{d} 00:00:00", f"{d} 23:59:59"]), "name": ("in", frappe.get_all("Has Role", filters={"role": "FC Student"}, pluck="parent"))})
            teachers = frappe.db.count("User", filters={"creation": ("between", [f"{d} 00:00:00", f"{d} 23:59:59"]), "name": ("in", frappe.get_all("Has Role", filters={"role": "FC Teacher"}, pluck="parent"))})
            growthData.append({"name": label, "students": students, "teachers": teachers})
            
    elif filter_type == "month":
        # Last 4 weeks
        for i in range(3, -1, -1):
            start_d = add_days(today, -(i * 7 + 6))
            end_d = add_days(today, -(i * 7))
            label = f"W{4-i}"
            students = frappe.db.count("User", filters={"creation": ("between", [f"{start_d} 00:00:00", f"{end_d} 23:59:59"]), "name": ("in", frappe.get_all("Has Role", filters={"role": "FC Student"}, pluck="parent"))})
            teachers = frappe.db.count("User", filters={"creation": ("between", [f"{start_d} 00:00:00", f"{end_d} 23:59:59"]), "name": ("in", frappe.get_all("Has Role", filters={"role": "FC Teacher"}, pluck="parent"))})
            growthData.append({"name": label, "students": students, "teachers": teachers})
            
    elif filter_type == "year":
        # Last 12 months
        for i in range(11, -1, -1):
            target_date = add_months(today, -i)
            start_d = target_date.replace(day=1)
            # a simple way to get end of month is add 1 month then subtract 1 day, but we can just use frappe.utils.get_last_day
            from frappe.utils import get_last_day
            end_d = get_last_day(target_date)
            label = f"T{target_date.month}"
            students = frappe.db.count("User", filters={"creation": ("between", [f"{start_d} 00:00:00", f"{end_d} 23:59:59"]), "name": ("in", frappe.get_all("Has Role", filters={"role": "FC Student"}, pluck="parent"))})
            teachers = frappe.db.count("User", filters={"creation": ("between", [f"{start_d} 00:00:00", f"{end_d} 23:59:59"]), "name": ("in", frappe.get_all("Has Role", filters={"role": "FC Teacher"}, pluck="parent"))})
            growthData.append({"name": label, "students": students, "teachers": teachers})

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "growthData": growthData,
        "revenueData": [
            { "name": 'Tuần 1', "revenue": 4000000 },
            { "name": 'Tuần 2', "revenue": 3000000 },
            { "name": 'Tuần 3', "revenue": 2000000 },
            { "name": 'Tuần 4', "revenue": 2780000 },
        ]
    }

@frappe.whitelist()
def get_all_users():
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Không có quyền truy cập"), frappe.PermissionError)

    users = frappe.get_all("User", fields=["name", "full_name", "email", "creation as joinDate", "enabled"])
    
    result = []
    for u in users:
        roles = frappe.get_roles(u.name)
        role = "System"
        if "FC Admin" in roles:
            role = "FC Admin"
        elif "FC Teacher" in roles:
            role = "FC Teacher"
        elif "FC Student" in roles:
            role = "FC Student"
        
        status_str = "Active" if u.enabled else "Inactive"
            
        result.append({
            "id": u.name,
            "name": u.full_name or u.name,
            "email": u.email,
            "role": role,
            "status": status_str,
            "joinDate": u.joinDate.strftime("%Y-%m-%d") if u.joinDate else ""
        })
    return result

@frappe.whitelist()
def create_admin_user(email, full_name, password, role):
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        return {"success": False, "message": "Không có quyền truy cập"}
        
    import re
    if len(password) < 8 or not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
        return {"success": False, "message": "Mật khẩu phải dài ít nhất 8 ký tự, bao gồm cả chữ và số."}
        
    if frappe.db.exists("User", email):
        return {"success": False, "message": "Tài khoản với email này đã tồn tại"}
        
    user = frappe.get_doc({
        "doctype": "User",
        "email": email,
        "first_name": full_name,
        "enabled": 1,
        "send_welcome_email": 0
    })
    user.flags.no_welcome_mail = True
    user.insert(ignore_permissions=True)
    
    user.add_roles(role)
    
    from frappe.utils.password import update_password
    update_password(user=email, pwd=password)
    
    return {"success": True, "message": "Tạo tài khoản thành công"}

@frappe.whitelist()
def get_all_classes():
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Không có quyền truy cập"), frappe.PermissionError)

    classes = frappe.get_all("FC Class", fields=["name as id", "class_name as name", "teacher", "status"])
    
    result = []
    for c in classes:
        student_count = frappe.db.count("FC Class Member", {"parent": c.id})
        
        teacher_name = c.teacher
        if c.teacher:
            teacher_full_name = frappe.db.get_value("User", c.teacher, "full_name")
            if teacher_full_name:
                teacher_name = teacher_full_name
                
        result.append({
            "id": c.id,
            "name": c.name,
            "teacher": teacher_name,
            "students": student_count,
            "status": c.status or "Active"
        })
    return result

@frappe.whitelist()
def get_kyc_profiles():
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Không có quyền truy cập"), frappe.PermissionError)

    profiles = frappe.get_all("FC Teacher Profile", fields=["name", "full_name", "user as email", "status", "id_card_image", "certificate_image", "rejection_reason"])
    return profiles

@frappe.whitelist()
def process_kyc(profile_name, action, reason=""):
    try:
        if "FC Admin" not in frappe.get_roles(frappe.session.user):
            frappe.throw(_("Không có quyền truy cập"), frappe.PermissionError)

        profile = frappe.get_doc("FC Teacher Profile", profile_name)
        if action == "approve":
            profile.status = "Approved"
            profile.rejection_reason = ""
        elif action == "reject":
            profile.status = "Rejected"
            profile.rejection_reason = reason
            
            # Send rejection email
            try:
                subject = "Thông báo từ chối hồ sơ Giáo viên - FlyingClass"
                message = f"""
                <h3>Xin chào {profile.full_name},</h3>
                <p>Cảm ơn bạn đã gửi hồ sơ đăng ký trở thành Giáo viên trên hệ thống FlyingClass.</p>
                <p>Rất tiếc, hồ sơ của bạn chưa được duyệt với lý do sau:</p>
                <blockquote style="background-color: #f9f9f9; border-left: 5px solid #ff4d4f; padding: 10px; margin: 10px 0;">
                    {reason}
                </blockquote>
                <p>Tuy nhiên, tài khoản của bạn vẫn hoạt động bình thường. Bạn có thể đăng nhập lại vào hệ thống, vào mục <strong>Xác minh tài khoản</strong> và nhấn <strong>"Sửa hồ sơ & Gửi lại"</strong> để cập nhật bổ sung thông tin theo yêu cầu.</p>
                <p>Trân trọng,<br>Đội ngũ FlyingClass</p>
                """
                frappe.sendmail(
                    recipients=[profile.user],
                    subject=subject,
                    message=message,
                    now=True
                )
            except Exception as e:
                frappe.logger().error(f"Failed to send KYC rejection email to {profile.user}: {str(e)}")
                
        else:
            frappe.throw(_("Hành động không hợp lệ"))
            
        profile.save(ignore_permissions=True)
        frappe.db.commit()
        return {"success": True, "message": f"Hồ sơ đã được {action}."}
    except Exception as e:
        import traceback
        frappe.local.response['http_status_code'] = 500
        return "Lỗi Backend Admin:\n" + traceback.format_exc()

@frappe.whitelist()
def upload_kyc(id_card_url=None, certificate_url=None):
    # This will be called by Teacher to upload KYC
    user = frappe.session.user
    if "FC Teacher" not in frappe.get_roles(user):
        frappe.throw(_("Chỉ giáo viên mới có quyền upload KYC"), frappe.PermissionError)

    profile_name = frappe.db.get_value("FC Teacher Profile", {"user": user}, "name")
    if not profile_name:
        frappe.throw(_("Không tìm thấy hồ sơ giáo viên!"))
        
    profile = frappe.get_doc("FC Teacher Profile", profile_name)
    
    if id_card_url:
        profile.id_card_image = id_card_url
    if certificate_url:
        profile.certificate_image = certificate_url
        
    profile.status = "Pending"
    profile.rejection_reason = ""
    profile.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {"success": True, "message": "Cập nhật KYC thành công"}

@frappe.whitelist(allow_guest=True)
def fix_doctype():
    doc = frappe.get_doc("DocType", "FC Teacher Profile")
    fields_to_add = [
        {"fieldname": "kyc_section", "fieldtype": "Section Break", "label": "KYC Documents"},
        {"fieldname": "id_card_image", "fieldtype": "Attach Image", "label": "ID Card (CCCD)"},
        {"fieldname": "certificate_image", "fieldtype": "Attach Image", "label": "Teaching Certificate"},
        {"fieldname": "rejection_reason", "fieldtype": "Data", "label": "Rejection Reason", "depends_on": "eval:doc.status=='Rejected'"}
    ]
    existing_fields = [f.fieldname for f in doc.fields]
    changed = False
    for field in fields_to_add:
        if field["fieldname"] not in existing_fields:
            doc.append("fields", field)
            changed = True
    if changed:
        doc.save()
        frappe.db.commit()
    return {"success": True, "message": "Fixed doctype"}

@frappe.whitelist()
def get_user_profile(email):
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Không có quyền truy cập"), frappe.PermissionError)

    user = frappe.get_doc("User", email)
    roles = frappe.get_roles(user.name)
    
    profile_data = {
        "id": user.name,
        "name": user.full_name,
        "email": user.email,
        "status": "Active" if user.enabled else "Inactive",
        "joinDate": user.creation.strftime("%Y-%m-%d") if user.creation else "",
        "roles": roles,
        "phone": user.mobile_no or user.phone or "",
        "dob": user.birth_date or ""
    }

    if "FC Teacher" in roles:
        # fetch FC Teacher Profile
        teacher_profile = frappe.db.get_value("FC Teacher Profile", {"user": email}, ["phone", "dob", "cccd_number", "id_card_image", "certificate_image", "status", "rejection_reason"], as_dict=True)
        if teacher_profile:
            profile_data.update({
                "phone": teacher_profile.phone or profile_data["phone"],
                "dob": teacher_profile.dob or profile_data["dob"],
                "cccd_number": teacher_profile.cccd_number,
                "id_card_image": teacher_profile.id_card_image,
                "certificate_image": teacher_profile.certificate_image,
                "kyc_status": teacher_profile.status,
                "rejection_reason": teacher_profile.rejection_reason
            })
            
    return profile_data

@frappe.whitelist()
def toggle_user_status(email):
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Không có quyền truy cập"), frappe.PermissionError)
        
    user = frappe.get_doc("User", email)
    user.enabled = 0 if user.enabled else 1
    user.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True, "message": "Đã mở khóa tài khoản" if user.enabled == 1 else "Đã khóa tài khoản"}

@frappe.whitelist()
def delete_user(email):
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        return {"success": False, "message": "Không có quyền truy cập"}
        
    if email == frappe.session.user:
        return {"success": False, "message": "Không thể xóa chính bạn"}
        
    try:
        # Xóa các profile liên quan trước
        if frappe.db.exists("FC Teacher Profile", email):
            frappe.delete_doc("FC Teacher Profile", email, ignore_permissions=True, force=True)
            
        if frappe.db.exists("FC Student Profile", email):
            frappe.delete_doc("FC Student Profile", email, ignore_permissions=True, force=True)
            
        frappe.delete_doc("User", email, ignore_permissions=True, force=True)
        return {"success": True, "message": "Xóa tài khoản thành công"}
    except frappe.LinkExistsError as e:
        return {"success": False, "message": f"Không thể xóa vì tài khoản này đang có dữ liệu liên kết (Lớp học, Tài liệu, v.v.). Vui lòng khóa tài khoản thay vì xóa."}
    except Exception as e:
        return {"success": False, "message": f"Lỗi khi xóa tài khoản: {str(e)}"}

@frappe.whitelist()
def get_ai_config():
    user = frappe.session.user
    if "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền"}

    settings = frappe.get_single("FC AI Settings")
    active_model = settings.active_model
    gemini_key = settings.gemini_api_key
    gpt4o_key = settings.gpt4o_api_key
    
    from datetime import datetime
    current_month = datetime.now().month
    current_year = datetime.now().year

    # Aggregate tokens for the current month
    tokens = frappe.db.sql("""
        SELECT SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens
        FROM `tabFC AI Token Usage`
        WHERE EXTRACT(MONTH FROM creation) = %s AND EXTRACT(YEAR FROM creation) = %s
    """, (current_month, current_year), as_dict=True)

    input_tokens = tokens[0].input_tokens or 0 if tokens else 0
    output_tokens = tokens[0].output_tokens or 0 if tokens else 0
    
    cost_estimation = (input_tokens * 0.35 / 1000000) + (output_tokens * 1.05 / 1000000)

    # Group by day for the chart
    daily_usage = frappe.db.sql("""
        SELECT TO_CHAR(creation, 'DD/MM') as name, 
               SUM(input_tokens) as input, 
               SUM(output_tokens) as output
        FROM `tabFC AI Token Usage`
        WHERE EXTRACT(MONTH FROM creation) = %s AND EXTRACT(YEAR FROM creation) = %s
        GROUP BY CAST(creation AS DATE), TO_CHAR(creation, 'DD/MM')
        ORDER BY CAST(creation AS DATE) ASC
    """, (current_month, current_year), as_dict=True)
    
    # Fill missing days if needed (simple approach: just return days that have data)

    return {
        "success": True,
        "message": {
            "active_model": active_model,
            "gemini_api_key": gemini_key or "",
            "gpt4o_api_key": gpt4o_key or "",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost_estimation": round(cost_estimation, 2),
            "tokenUsageData": daily_usage
        }
    }

@frappe.whitelist()
def update_ai_config(active_model, gemini_api_key=None, gpt4o_api_key=None):
    user = frappe.session.user
    if "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền"}

    settings = frappe.get_single("FC AI Settings")
    if active_model:
        settings.active_model = active_model
    if gemini_api_key is not None:
        settings.gemini_api_key = gemini_api_key
    if gpt4o_api_key is not None:
        settings.gpt4o_api_key = gpt4o_api_key
        
    settings.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True, "message": "Cập nhật cấu hình thành công."}

@frappe.whitelist()
def request_ai_config_unlock():
    user = frappe.session.user
    if "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền"}
        
    import random, string
    otp = ''.join(random.choices(string.digits, k=6))
    frappe.cache().set_value(f"otp_ai_{user}", otp, expires_in_sec=300)
    
    # Try sending email
    try:
        subject = "Mã xác thực (OTP) mở khóa cấu hình AI"
        message = f"""
        <p>Xin chào Admin,</p>
        <p>Bạn vừa yêu cầu mở khóa cấu hình AI trên hệ thống FlyingClass.</p>
        <p>Mã xác thực (OTP) của bạn là: <strong>{otp}</strong></p>
        <p>Mã này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        """
        frappe.sendmail(recipients=[user], subject=subject, message=message, now=True)
        return {"success": True, "message": "OTP đã được gửi tới email của bạn."}
    except Exception as e:
        frappe.logger().error(f"Failed to send OTP email: {str(e)}")
        # Dev mode fallback
        return {"success": True, "message": f"Dev Mode: Không có Mail Server. Mã OTP của bạn là: {otp}"}

@frappe.whitelist()
def verify_ai_config_otp(otp):
    user = frappe.session.user
    if "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền"}
        
    cached_otp = frappe.cache().get_value(f"otp_ai_{user}")
    
    if not cached_otp:
        return {"success": False, "message": "Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại."}
        
    if str(cached_otp) != str(otp):
        return {"success": False, "message": "Mã OTP không chính xác!"}
        
    frappe.cache().delete_value(f"otp_ai_{user}")
    return {"success": True, "message": "Xác thực thành công"}

@frappe.whitelist()
def get_system_settings():
    user = frappe.session.user
    if "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền"}
        
    settings = frappe.get_single("FC System Settings")
    return {
        "success": True, 
        "data": {
            "maintenance_mode": settings.maintenance_mode
        }
    }

@frappe.whitelist()
def update_system_settings(maintenance_mode):
    user = frappe.session.user
    if "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền"}
        
    settings = frappe.get_single("FC System Settings")
    settings.maintenance_mode = int(maintenance_mode)
    settings.save(ignore_permissions=True)
    frappe.db.commit()
    return {"success": True, "message": "Đã cập nhật cài đặt hệ thống"}

@frappe.whitelist()
def get_pending_subscriptions():
    user = frappe.session.user
    if "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền"}
        
    orders = frappe.get_all(
        "FC AI Subscription Order",
        filters={"status": "Pending"},
        fields=["name", "teacher", "package_type", "amount", "order_code", "creation"],
        order_by="creation desc"
    )
    
    for o in orders:
        o["teacher_name"] = frappe.db.get_value("User", o.teacher, "full_name") or o.teacher
        
    return {"success": True, "data": orders}

@frappe.whitelist()
def approve_subscription(order_id, status):
    user = frappe.session.user
    if "FC Admin" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền"}
        
    order = frappe.get_doc("FC AI Subscription Order", order_id)
    if order.status != "Pending":
        return {"success": False, "message": "Đơn hàng đã được xử lý"}
        
    if status not in ["Approved", "Rejected"]:
        return {"success": False, "message": "Trạng thái không hợp lệ"}
        
    order.status = status
    from frappe.utils import now_datetime
    order.payment_date = now_datetime()
    
    if status == "Approved":
        teacher_user = frappe.get_doc("User", order.teacher)
        current_exp = teacher_user.get("custom_ai_expiration_date")
        
        from frappe.utils import add_days, getdate, today
        
        start_date = getdate(today())
        if current_exp and getdate(current_exp) > start_date:
            start_date = getdate(current_exp)
            
        days_to_add = 30 if order.package_type == "Monthly" else 365
        new_exp = add_days(start_date, days_to_add)
        
        teacher_user.db_set("custom_ai_expiration_date", new_exp)
        
    order.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {"success": True, "message": f"Đã {status} đơn hàng thành công"}
