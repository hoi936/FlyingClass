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
    revenueData = []
    
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
            rev = frappe.db.sql("""
                SELECT COALESCE(SUM(amount), 0)
                FROM `tabFC AI Subscription Order`
                WHERE status IN ('Paid', 'Approved')
                  AND creation BETWEEN %s AND %s
            """, (f"{d} 00:00:00", f"{d} 23:59:59"))[0][0] or 0
            revenueData.append({"name": label, "revenue": int(rev)})
            
    elif filter_type == "month":
        # Last 4 weeks
        for i in range(3, -1, -1):
            start_d = add_days(today, -(i * 7 + 6))
            end_d = add_days(today, -(i * 7))
            label = f"W{4-i}"
            students = frappe.db.count("User", filters={"creation": ("between", [f"{start_d} 00:00:00", f"{end_d} 23:59:59"]), "name": ("in", frappe.get_all("Has Role", filters={"role": "FC Student"}, pluck="parent"))})
            teachers = frappe.db.count("User", filters={"creation": ("between", [f"{start_d} 00:00:00", f"{end_d} 23:59:59"]), "name": ("in", frappe.get_all("Has Role", filters={"role": "FC Teacher"}, pluck="parent"))})
            growthData.append({"name": label, "students": students, "teachers": teachers})
            rev = frappe.db.sql("""
                SELECT COALESCE(SUM(amount), 0)
                FROM `tabFC AI Subscription Order`
                WHERE status IN ('Paid', 'Approved')
                  AND creation BETWEEN %s AND %s
            """, (f"{start_d} 00:00:00", f"{end_d} 23:59:59"))[0][0] or 0
            revenueData.append({"name": label, "revenue": int(rev)})
            
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
            rev = frappe.db.sql("""
                SELECT COALESCE(SUM(amount), 0)
                FROM `tabFC AI Subscription Order`
                WHERE status IN ('Paid', 'Approved')
                  AND creation BETWEEN %s AND %s
            """, (f"{start_d} 00:00:00", f"{end_d} 23:59:59"))[0][0] or 0
            revenueData.append({"name": label, "revenue": int(rev)})

    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "growthData": growthData,
        "revenueData": revenueData
    }

@frappe.whitelist()
def get_all_users():
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Không có quyền truy cập"), frappe.PermissionError)

    users = frappe.get_all("User", fields=["name", "full_name", "email", "creation as joinDate", "enabled", "custom_ai_package_type", "custom_ai_expiration_date"])
    
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
        ai_expiration_date = u.get("custom_ai_expiration_date")
        ai_subscription_active = False
        ai_package_type = ""
        used_tokens = 0
        token_limit = 0
        
        if role in ["FC Teacher", "FC Student"]:
            from frappe.utils import getdate, today
            if ai_expiration_date:
                ai_subscription_active = getdate(ai_expiration_date) >= getdate(today())
            ai_package_type = u.get("custom_ai_package_type") or "Normal"
            
            try:
                from flying_class.flying_class.api import get_subscription_start_date, get_user_token_usage
                
                total_custom_tokens = 0
                orders = frappe.db.sql("""
                    SELECT package_type FROM `tabFC AI Subscription Order`
                    WHERE teacher = %s AND status IN ('Paid', 'Approved') AND package_type LIKE %s
                """, (u.email, 'Custom_%'), as_dict=True)
                for o in orders:
                    try:
                        total_custom_tokens += int(o.package_type.split("_")[1])
                    except:
                        pass
                
                if role == "FC Teacher":
                    start_date = get_subscription_start_date(u.email)
                    base_limit = 120000 if ai_package_type == "Pro" else 50000
                    if not ai_subscription_active:
                        base_limit = 0
                    token_limit = base_limit + total_custom_tokens
                    used_tokens = get_user_token_usage(u.email, start_date)
                    
                    if not ai_subscription_active and total_custom_tokens > 0:
                        ai_subscription_active = True
                        ai_package_type = "Token Lẻ"
                else:
                    token_limit = 50000
                    used_tokens = get_user_token_usage(u.email)
            except Exception:
                used_tokens = 0
                token_limit = 50000 if role == "FC Student" else 0
            
        result.append({
            "id": u.name,
            "name": u.full_name or u.name,
            "email": u.email,
            "role": role,
            "status": status_str,
            "joinDate": u.joinDate.strftime("%Y-%m-%d") if u.joinDate else "",
            "ai_subscription_active": ai_subscription_active,
            "ai_expiration_date": ai_expiration_date,
            "ai_package_type": ai_package_type,
            "used_tokens": used_tokens,
            "token_limit": token_limit
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

    profiles = frappe.get_all("FC Teacher Profile", fields=["name", "full_name", "user as email", "status", "id_card_image", "certificate_image", "rejection_reason", "cert_ai_status", "cert_ai_confidence", "cert_ai_checked"])
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
def run_kyc_ai_scan(profile_name):
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Không có quyền truy cập"), frappe.PermissionError)
        
    profile = frappe.get_doc("FC Teacher Profile", profile_name)
    if not profile.certificate_image:
        return {"success": False, "message": "Giáo viên chưa tải lên bằng cấp/chứng chỉ."}
        
    from flying_class.flying_class.ai_verification import predict_certificate, get_absolute_path
    abs_path = get_absolute_path(profile.certificate_image)
    if not abs_path:
        return {"success": False, "message": "Không tìm thấy file ảnh của chứng chỉ trên server."}
        
    res = predict_certificate(abs_path)
    profile.cert_ai_status = res.get("status", "Error")
    profile.cert_ai_confidence = res.get("confidence", 0.0)
    profile.cert_ai_checked = 1
    profile.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {
        "success": True, 
        "message": "Quét AI hoàn tất", 
        "cert_ai_status": profile.cert_ai_status, 
        "cert_ai_confidence": profile.cert_ai_confidence
    }

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
        
        # Run AI Scan
        try:
            from flying_class.flying_class.ai_verification import predict_certificate, get_absolute_path
            abs_path = get_absolute_path(certificate_url)
            if abs_path:
                res = predict_certificate(abs_path)
                profile.cert_ai_status = res.get("status", "Error")
                profile.cert_ai_confidence = res.get("confidence", 0.0)
                profile.cert_ai_checked = 1
            else:
                profile.cert_ai_status = "Error"
                profile.cert_ai_confidence = 0.0
                profile.cert_ai_checked = 1
        except Exception as e:
            frappe.logger().error(f"Error invoking AI scan during upload: {str(e)}")
            profile.cert_ai_status = "Error"
            profile.cert_ai_confidence = 0.0
            profile.cert_ai_checked = 1
        
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
        {"fieldname": "rejection_reason", "fieldtype": "Data", "label": "Rejection Reason", "depends_on": "eval:doc.status=='Rejected'"},
        {"fieldname": "cert_ai_status", "fieldtype": "Data", "label": "AI Verification Status"},
        {"fieldname": "cert_ai_confidence", "fieldtype": "Float", "label": "AI Verification Confidence"},
        {"fieldname": "cert_ai_checked", "fieldtype": "Check", "label": "AI Checked"}
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
        teacher_profile = frappe.db.get_value("FC Teacher Profile", {"user": email}, ["phone", "dob", "cccd_number", "id_card_image", "certificate_image", "status", "rejection_reason", "cert_ai_status", "cert_ai_confidence", "cert_ai_checked"], as_dict=True)
        if teacher_profile:
            profile_data.update({
                "phone": teacher_profile.phone or profile_data["phone"],
                "dob": teacher_profile.dob or profile_data["dob"],
                "cccd_number": teacher_profile.cccd_number,
                "id_card_image": teacher_profile.id_card_image,
                "certificate_image": teacher_profile.certificate_image,
                "kyc_status": teacher_profile.status,
                "rejection_reason": teacher_profile.rejection_reason,
                "cert_ai_status": teacher_profile.cert_ai_status,
                "cert_ai_confidence": teacher_profile.cert_ai_confidence,
                "cert_ai_checked": teacher_profile.cert_ai_checked
            })
        
        # Add AI subscription details
        ai_expiration_date = user.get("custom_ai_expiration_date")
        ai_subscription_active = False
        ai_package_type = ""
        used_tokens = 0
        token_limit = 50000
        
        if ai_expiration_date:
            from frappe.utils import getdate, today
            ai_subscription_active = getdate(ai_expiration_date) >= getdate(today())
            ai_package_type = user.get("custom_ai_package_type") or "Normal"
            token_limit = 120000 if ai_package_type == "Pro" else 50000
            
            try:
                from flying_class.flying_class.api import get_subscription_start_date, get_user_token_usage
                start_date = get_subscription_start_date(email)
                used_tokens = get_user_token_usage(email, start_date)
            except Exception:
                used_tokens = 0
        
        profile_data.update({
            "ai_expiration_date": str(ai_expiration_date) if ai_expiration_date else "",
            "ai_subscription_active": ai_subscription_active,
            "ai_package_type": ai_package_type,
            "used_tokens": used_tokens,
            "token_limit": token_limit
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
    tokens_raw = frappe.db.sql("""
        SELECT model, SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens
        FROM `tabFC AI Token Usage`
        WHERE EXTRACT(MONTH FROM creation) = %s AND EXTRACT(YEAR FROM creation) = %s
        GROUP BY model
    """, (current_month, current_year), as_dict=True)

    input_tokens = 0
    output_tokens = 0
    cost_estimation = 0.0
    
    for row in tokens_raw:
        in_t = row.input_tokens or 0
        out_t = row.output_tokens or 0
        input_tokens += in_t
        output_tokens += out_t
        if row.model and "gpt" in row.model.lower():
            cost_estimation += (in_t * 2.50 / 1000000) + (out_t * 10.00 / 1000000)
        else:
            cost_estimation += (in_t * 0.35 / 1000000) + (out_t * 1.05 / 1000000)

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
        fields=["name", "teacher", "package_type", "amount", "order_code", "creation", "status"],
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
        
        if not str(order.package_type).startswith("Custom_"):
            current_exp = teacher_user.get("custom_ai_expiration_date")
            
            from frappe.utils import add_days, getdate, today
            
            start_date = getdate(today())
            if current_exp and getdate(current_exp) > start_date:
                start_date = getdate(current_exp)
                
            days_to_add = 30 if order.package_type in ["Monthly", "Pro_Monthly"] else 365
            new_exp = add_days(start_date, days_to_add)
            
            teacher_user.db_set("custom_ai_expiration_date", new_exp)
            
            # Set package type
            tier = "Pro" if "Pro" in order.package_type else "Normal"
            if any(df.fieldname == "custom_ai_package_type" for df in frappe.get_meta("User").fields):
                teacher_user.db_set("custom_ai_package_type", tier)
        else:
            # Token lẻ extends expiration date by 30 days
            current_exp = teacher_user.get("custom_ai_expiration_date")
            from frappe.utils import add_days, getdate, today
            start_date = getdate(today())
            if current_exp and getdate(current_exp) > start_date:
                start_date = getdate(current_exp)
            new_exp = add_days(start_date, 30)
            teacher_user.db_set("custom_ai_expiration_date", new_exp)
                
        if any(df.fieldname == "custom_ai_trial_messages_used" for df in frappe.get_meta("User").fields):
            teacher_user.db_set("custom_ai_trial_messages_used", 0)
        
    order.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {"success": True, "message": f"Đã {status} đơn hàng thành công"}
@frappe.whitelist()
def get_subscription_stats(filter_type="month", selected_date=None):
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Khong co quyen truy cap"), frappe.PermissionError)

    from frappe.utils import getdate, add_days, add_months, formatdate, today, get_last_day
    
    current_date = getdate(today())
    if selected_date:
        try:
            current_date = getdate(selected_date)
        except Exception:
            pass

    start_date = None
    end_date = None
    trend_type = "daily"

    if filter_type == "week":
        # Last 7 days
        start_date = add_days(current_date, -6)
        end_date = current_date
        trend_type = "daily"
    elif filter_type == "month":
        # Selected month
        start_date = current_date.replace(day=1)
        end_date = get_last_day(current_date)
        trend_type = "daily"
    elif filter_type == "year":
        # Selected year (from Jan 1 to Dec 31)
        start_date = current_date.replace(month=1, day=1)
        end_date = current_date.replace(month=12, day=31)
        trend_type = "monthly"
    elif filter_type == "day":
        # Specific day
        start_date = current_date
        end_date = current_date
        trend_type = "hourly"

    # 1. Total revenue
    rev_query = """
        SELECT COALESCE(SUM(amount), 0)
        FROM `tabFC AI Subscription Order`
        WHERE status IN ('Paid', 'Approved')
    """
    params = []
    if start_date and end_date:
        rev_query += " AND creation BETWEEN %s AND %s"
        params.extend([f"{start_date} 00:00:00", f"{end_date} 23:59:59"])
    total_revenue = frappe.db.sql(rev_query, tuple(params))[0][0] or 0

    # 2. Teacher count
    teacher_query = """
        SELECT COUNT(DISTINCT teacher)
        FROM `tabFC AI Subscription Order`
        WHERE status IN ('Paid', 'Approved')
    """
    if start_date and end_date:
        teacher_query += " AND creation BETWEEN %s AND %s"
    teacher_count = frappe.db.sql(teacher_query, tuple(params))[0][0] or 0

    # 3. Package breakdown
    pkg_query = """
        SELECT package_type as "packageId",
               COUNT(*) as orders,
               COALESCE(SUM(amount), 0) as revenue
        FROM `tabFC AI Subscription Order`
        WHERE status IN ('Paid', 'Approved')
    """
    if start_date and end_date:
        pkg_query += " AND creation BETWEEN %s AND %s"
    pkg_query += " GROUP BY package_type ORDER BY package_type"
    revenue_by_package = frappe.db.sql(pkg_query, tuple(params), as_dict=True)

    # 4. Latest transactions
    transaction_filters = {"status": ["in", ["Paid", "Approved"]]}
    if start_date and end_date:
        transaction_filters["creation"] = ["between", [f"{start_date} 00:00:00", f"{end_date} 23:59:59"]]
    latest_transactions = frappe.get_all(
        "FC AI Subscription Order",
        filters=transaction_filters,
        fields=[
            "name", "teacher", "package_type", "amount", "status", "creation",
            "paid_at", "vnp_transaction_no", "vnp_response_code"
        ],
        order_by="paid_at desc, creation desc",
        limit=50 if filter_type == "day" else 20
    )

    # 5. Trend Data
    trend_data = []
    if trend_type == "daily" and start_date and end_date:
        loop_end = min(end_date, getdate(today()))
        day_count = (loop_end - start_date).days + 1
        if day_count > 0:
            for i in range(day_count):
                d = add_days(start_date, i)
                label = formatdate(d, "dd/MM")
                rev = frappe.db.sql("""
                    SELECT COALESCE(SUM(amount), 0)
                    FROM `tabFC AI Subscription Order`
                    WHERE status IN ('Paid', 'Approved')
                      AND creation BETWEEN %s AND %s
                """, (f"{d} 00:00:00", f"{d} 23:59:59"))[0][0] or 0
                trend_data.append({"name": label, "revenue": int(rev)})
            
    elif trend_type == "monthly" and start_date and end_date:
        for i in range(12):
            target_date = add_months(start_date, i)
            month_start = target_date.replace(day=1)
            month_end = get_last_day(target_date)
            label = f"T{target_date.month}/{str(target_date.year)[2:]}"
            rev = frappe.db.sql("""
                SELECT COALESCE(SUM(amount), 0)
                FROM `tabFC AI Subscription Order`
                WHERE status IN ('Paid', 'Approved')
                  AND creation BETWEEN %s AND %s
            """, (f"{month_start} 00:00:00", f"{month_end} 23:59:59"))[0][0] or 0
            trend_data.append({"name": label, "revenue": int(rev)})
            
    elif trend_type == "hourly" and start_date:
        intervals = [
            ("00:00", "03:59", "Đêm"),
            ("04:00", "07:59", "Sáng sớm"),
            ("08:00", "11:59", "Sáng"),
            ("12:00", "15:59", "Chiều"),
            ("16:00", "19:59", "Tối"),
            ("20:00", "23:59", "Khuya")
        ]
        for start_t, end_t, label in intervals:
            rev = frappe.db.sql("""
                SELECT COALESCE(SUM(amount), 0)
                FROM `tabFC AI Subscription Order`
                WHERE status IN ('Paid', 'Approved')
                  AND creation BETWEEN %s AND %s
            """, (f"{start_date} {start_t}:00", f"{start_date} {end_t}:59"))[0][0] or 0
            trend_data.append({"name": f"{label} ({start_t})", "revenue": int(rev)})

    return {
        "success": True,
        "data": {
            "total_revenue": int(total_revenue),
            "teacher_count": int(teacher_count),
            "revenue_by_package": revenue_by_package,
            "latest_transactions": latest_transactions,
            "daily_revenue": trend_data,
        }
    }

@frappe.whitelist()
def get_ai_subscriptions(status=None):
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Khong co quyen truy cap"), frappe.PermissionError)

    filters = {}
    if status and status != "All":
        filters["status"] = status

    orders = frappe.get_all(
        "FC AI Subscription Order",
        filters=filters,
        fields=[
            "name", "teacher", "package_type", "amount", "status", "order_code",
            "payment_gateway", "creation", "paid_at", "payment_date",
            "vnp_transaction_no", "vnp_response_code", "vnp_transaction_status"
        ],
        order_by="creation desc",
    )

    for order in orders:
        order["teacher_name"] = frappe.db.get_value("User", order.teacher, "full_name") or order.teacher
        order["ai_expiration_date"] = frappe.db.get_value("User", order.teacher, "custom_ai_expiration_date")

    return {"success": True, "data": orders}

@frappe.whitelist()
def update_user_ai_package(email, ai_expiration_date=None, ai_package_type=None):
    if "FC Admin" not in frappe.get_roles(frappe.session.user):
        frappe.throw(_("Không có quyền truy cập"), frappe.PermissionError)

    user = frappe.get_doc("User", email)
    roles = frappe.get_roles(user.name)
    if "FC Teacher" not in roles:
        return {"success": False, "message": "Chỉ giáo viên mới có thể sử dụng gói AI"}

    has_trial_field = any(df.fieldname == "custom_ai_trial_messages_used" for df in frappe.get_meta("User").fields)

    if ai_expiration_date:
        user.db_set("custom_ai_expiration_date", ai_expiration_date)
        if has_trial_field:
            user.db_set("custom_ai_trial_messages_used", 0)
        
        # update package type if provided, otherwise default to Normal if not set
        if ai_package_type:
            user.db_set("custom_ai_package_type", ai_package_type)
        elif not user.get("custom_ai_package_type"):
            user.db_set("custom_ai_package_type", "Normal")
    else:
        user.db_set("custom_ai_expiration_date", None)
        user.db_set("custom_ai_package_type", "Normal")
        
    frappe.db.commit()
    return {"success": True, "message": "Cập nhật gói AI người dùng thành công"}
