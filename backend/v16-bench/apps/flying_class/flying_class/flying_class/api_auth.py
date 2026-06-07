import frappe
from frappe import _
import random
import string

@frappe.whitelist(allow_guest=True)
def send_otp(email):
    if frappe.db.exists("User", email):
        return {"success": False, "message": "Email này đã được sử dụng!"}
        
    otp = ''.join(random.choices(string.digits, k=6))
    
    # Store OTP temporarily in cache
    frappe.cache().set_value(f"otp_{email}", otp, expires_in_sec=300)
    
    # Send email
    subject = "Mã xác thực đăng ký FlyingClass"
    message = f"""
    <h3>Xin chào,</h3>
    <p>Bạn đang đăng ký tài khoản trên hệ thống FlyingClass.</p>
    <p>Mã xác thực (OTP) của bạn là: <strong>{otp}</strong></p>
    <p>Mã này sẽ hết hạn sau 5 phút.</p>
    <p>Trân trọng,<br>Đội ngũ FlyingClass</p>
    """
    
    try:
        frappe.sendmail(
            recipients=[email],
            subject=subject,
            message=message,
            now=True
        )
        return {"success": True, "message": "OTP đã được gửi tới email của bạn."}
    except Exception as e:
        frappe.logger().error(f"Failed to send OTP email: {str(e)}")
        # Development fallback: return OTP directly since no mail server is configured
        return {"success": True, "message": f"Dev Mode: Không có Mail Server. Mã OTP của bạn là: {otp}"}

@frappe.whitelist(allow_guest=True)
def verify_otp_and_signup(email, full_name, password, otp, role="FC Student"):
    # Verify OTP
    cached_otp = frappe.cache().get_value(f"otp_{email}")
    if not cached_otp:
        frappe.throw(_("Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại."))
        
    if str(cached_otp) != str(otp):
        frappe.throw(_("Mã OTP không chính xác!"))
        
    # Proceed with signup
    import re
    if len(password) < 8 or not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
        return {"success": False, "message": "Mật khẩu phải dài ít nhất 8 ký tự, bao gồm cả chữ và số."}
        
    if frappe.db.exists("User", email):
        return {"success": False, "message": "Email này đã được sử dụng!"}
        
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
            "status": "Not Submitted"
        })
        profile.insert(ignore_permissions=True)
        
    frappe.db.commit()
    
    # Clear OTP
    frappe.cache().delete_value(f"otp_{email}")
    
    return {"success": True, "message": "Đăng ký thành công!"}

@frappe.whitelist(allow_guest=True)
def custom_login(**kwargs):
    usr = kwargs.get('usr') or frappe.form_dict.get('usr')
    pwd = kwargs.get('pwd') or frappe.form_dict.get('pwd')
    
    if not usr or not pwd:
        # Try to parse from request data if possible
        try:
            import json
            data = json.loads(frappe.request.get_data())
            usr = usr or data.get('usr')
            pwd = pwd or data.get('pwd')
        except Exception:
            pass

    if not usr or not pwd:
        return {"success": False, "message": "Missing username or password"}

    # Check maintenance mode
    try:
        settings = frappe.get_single("FC System Settings")
        if settings.maintenance_mode:
            # Check if user is admin
            user = frappe.get_doc("User", usr)
            roles = [r.role for r in user.roles]
            if "FC Admin" not in roles and "System Manager" not in roles and "Administrator" not in roles and user.name != "Administrator":
                frappe.response["message"] = {"success": False, "message": "Hệ thống đang bảo trì, vui lòng quay lại sau."}
                return
    except Exception:
        pass # Ignore if doctype not found or other issues

    # Proceed with normal login
    login_manager = frappe.auth.LoginManager()
    login_manager.authenticate(user=usr, pwd=pwd)
    login_manager.post_login()
    
    frappe.response["message"] = {"success": True, "message": "Đăng nhập thành công"}

@frappe.whitelist(allow_guest=True)
def forgot_password_send_otp(email):
    if not frappe.db.exists("User", email):
        return {"success": False, "message": "Email này chưa được đăng ký trong hệ thống!"}
        
    otp = ''.join(random.choices(string.digits, k=6))
    
    # Store OTP temporarily in cache
    frappe.cache().set_value(f"otp_forgot_{email}", otp, expires_in_sec=300)
    
    # Send email
    subject = "Mã xác thực đổi mật khẩu FlyingClass"
    message = f"""
    <h3>Xin chào,</h3>
    <p>Bạn vừa yêu cầu đổi mật khẩu cho tài khoản trên hệ thống FlyingClass.</p>
    <p>Mã xác thực (OTP) của bạn là: <strong>{otp}</strong></p>
    <p>Mã này sẽ hết hạn sau 5 phút.</p>
    <p>Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
    <p>Trân trọng,<br>Đội ngũ FlyingClass</p>
    """
    
    try:
        frappe.sendmail(
            recipients=[email],
            subject=subject,
            message=message,
            now=True
        )
        return {"success": True, "message": "OTP đã được gửi tới email của bạn."}
    except Exception as e:
        frappe.logger().error(f"Failed to send forgot password OTP email: {str(e)}")
        # Development fallback
        return {"success": True, "message": f"Dev Mode: Không có Mail Server. Mã OTP của bạn là: {otp}"}

@frappe.whitelist(allow_guest=True)
def forgot_password_verify_otp(email, otp):
    cached_otp = frappe.cache().get_value(f"otp_forgot_{email}")
    if not cached_otp:
        return {"success": False, "message": "Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại."}
        
    if str(cached_otp) != str(otp):
        return {"success": False, "message": "Mã OTP không chính xác!"}
        
    return {"success": True, "message": "OTP hợp lệ"}

@frappe.whitelist(allow_guest=True)
def forgot_password_reset(email, otp, new_password):
    import re
    cached_otp = frappe.cache().get_value(f"otp_forgot_{email}")
    if not cached_otp:
        return {"success": False, "message": "Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại."}
        
    if str(cached_otp) != str(otp):
        return {"success": False, "message": "Mã OTP không chính xác!"}
        
    if len(new_password) < 8 or not re.search(r'[A-Za-z]', new_password) or not re.search(r'\d', new_password):
        return {"success": False, "message": "Mật khẩu phải dài ít nhất 8 ký tự, bao gồm cả chữ và số."}
        
    if not frappe.db.exists("User", email):
        return {"success": False, "message": "Email này chưa được đăng ký!"}
        
    # Clear OTP
    frappe.cache().delete_value(f"otp_forgot_{email}")
    
    # Update password
    try:
        frappe.utils.password.update_password(user=email, pwd=new_password)
        return {"success": True, "message": "Đổi mật khẩu thành công!"}
    except Exception as e:
        return {"success": False, "message": f"Có lỗi xảy ra: {str(e)}"}

@frappe.whitelist(allow_guest=True)
def get_google_auth_url(redirect_to="http://localhost:5173/"):
    from frappe.utils.oauth import get_oauth2_authorize_url
    try:
        url = get_oauth2_authorize_url("google", redirect_to=redirect_to)
        return {"success": True, "url": url}
    except Exception as e:
        return {"success": False, "message": f"Lỗi lấy URL: {str(e)}"}

@frappe.whitelist(allow_guest=True)
def custom_login_via_google(code: str = None, state: str = None):
    from frappe.utils.oauth import get_info_via_oauth, login_oauth_user, get_oauth2_authorize_url
    from frappe.integrations.oauth2_logins import decoder_compat
    
    if not code or not state:
        # If accessed directly without code/state, redirect to Google OAuth URL
        redirect_to = "http://localhost:5173/"
        url = get_oauth2_authorize_url("google", redirect_to=redirect_to)
        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = url
        return
        
    try:
        info = get_info_via_oauth("google", code, decoder=decoder_compat)
    except Exception as e:
        frappe.respond_as_web_page("Xác thực thất bại", f"Không thể lấy thông tin từ Google: {str(e)}", success=False, http_status_code=400)
        return
        
    email = info.get("email")
    if not email:
        frappe.respond_as_web_page("Lỗi", "Không tìm thấy email từ tài khoản Google của bạn.", success=False, http_status_code=400)
        return
        
    if not frappe.db.exists("User", email):
        import urllib.parse
        import json
        import base64
        
        # Parse state to find frontend origin
        redirect_to = "http://localhost:5173/register"
        try:
            if isinstance(state, str):
                decoded_state = json.loads(base64.b64decode(state).decode("utf-8"))
                original_redirect = decoded_state.get("redirect_to", "")
                if "127.0.0.1" in original_redirect or "localhost" in original_redirect:
                    parsed = urllib.parse.urlparse(original_redirect)
                    redirect_to = f"{parsed.scheme}://{parsed.netloc}/register"
        except:
            pass
            
        params = urllib.parse.urlencode({
            "email": email,
            "full_name": info.get("name") or info.get("given_name") or "",
        })
        
        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = f"{redirect_to}?{params}"
        return
        
    # Find original frontend origin from state
    import urllib.parse
    import json
    import base64
    import secrets

    redirect_to = "http://localhost:5173/login"
    try:
        if isinstance(state, str):
            decoded_state = json.loads(base64.b64decode(state).decode("utf-8"))
            original_redirect = decoded_state.get("redirect_to", "")
            if "127.0.0.1" in original_redirect or "localhost" in original_redirect:
                parsed = urllib.parse.urlparse(original_redirect)
                redirect_to = f"{parsed.scheme}://{parsed.netloc}/login"
    except:
        pass

    # Ensure the user has Google social login mapped
    from frappe.utils.oauth import update_oauth_user
    try:
        update_oauth_user(email, info, "google")
    except Exception as e:
        frappe.logger().error(f"Failed to update oauth user mapping: {str(e)}")

    # Generate login token and store in cache
    login_token = secrets.token_hex(16)
    frappe.cache().set_value(f"login_token:{login_token}", email, expires_in_sec=120)
    
    frappe.local.response["type"] = "redirect"
    frappe.local.response["location"] = f"{redirect_to}?token={login_token}"

@frappe.whitelist(allow_guest=True)
def login_with_token(token):
    if not token:
        return {"success": False, "message": "Missing token"}
        
    email = frappe.cache().get_value(f"login_token:{token}")
    if not email:
        return {"success": False, "message": "Mã xác thực đăng nhập Google đã hết hạn hoặc không hợp lệ!"}
        
    # Delete token after use
    frappe.cache().delete_value(f"login_token:{token}")
    
    # Check user existence and status
    if not frappe.db.exists("User", email):
        return {"success": False, "message": "Tài khoản không tồn tại!"}
        
    user_doc = frappe.get_doc("User", email)
    if not user_doc.enabled:
        return {"success": False, "message": f"Tài khoản {email} đang bị khóa!"}

    # Check maintenance mode
    try:
        settings = frappe.get_single("FC System Settings")
        if settings.maintenance_mode:
            roles = [r.role for r in user_doc.roles]
            if "FC Admin" not in roles and "System Manager" not in roles and "Administrator" not in roles and user_doc.name != "Administrator":
                return {"success": False, "message": "Hệ thống đang bảo trì, vui lòng quay lại sau."}
    except Exception:
        pass

    # Log in user
    login_manager = frappe.auth.LoginManager()
    login_manager.login_as(email)
    
    # Save session and commit
    frappe.db.commit()
    
    return {"success": True, "message": "Đăng nhập thành công"}

