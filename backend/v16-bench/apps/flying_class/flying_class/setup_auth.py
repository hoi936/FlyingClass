import frappe
import os

def execute():
    # Setup Default Email Account
    email_id = "phandinhhoi2709@gmail.com"
    existing = frappe.db.get_value("Email Account", {"email_id": email_id}, "name")
    if not existing:
        doc = frappe.get_doc({
            "doctype": "Email Account",
            "email_account_name": "Default Outgoing",
            "email_id": email_id,
            "password": "ytqdueboiqnfybvq",
            "enable_outgoing": 1,
            "default_outgoing": 1,
            "smtp_server": "smtp.gmail.com",
            "smtp_port": 587,
            "use_tls": 1
        })
        doc.insert(ignore_permissions=True)
    else:
        doc = frappe.get_doc("Email Account", existing)
        doc.email_id = email_id
        doc.password = "ytqdueboiqnfybvq"
        doc.enable_outgoing = 1
        doc.default_outgoing = 1
        doc.save(ignore_permissions=True)

    # Setup Google Social Login
    existing_google = frappe.db.get_value("Social Login Key", {"provider_name": "Google"}, "name")
    if not existing_google:
        google = frappe.get_doc({
            "doctype": "Social Login Key",
            "provider_name": "Google",
            "client_id": os.environ.get("GOOGLE_CLIENT_ID", "YOUR_CLIENT_ID_HERE"),
            "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", "YOUR_CLIENT_SECRET_HERE"),
            "base_url": "https://www.googleapis.com",
            "authorize_url": "https://accounts.google.com/o/oauth2/auth",
            "access_token_url": "https://accounts.google.com/o/oauth2/token",
            "redirect_url": "/api/method/frappe.integrations.oauth2_logins.login_via_google",
            "api_endpoint": "https://www.googleapis.com/oauth2/v2/userinfo",
            "auth_url_data": '{"response_type": "code", "scope": "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"}',
            "user_id_property": "id",
            "enable_social_login": 1
        })
        google.insert(ignore_permissions=True)
    else:
        google = frappe.get_doc("Social Login Key", existing_google)
        google.client_id = os.environ.get("GOOGLE_CLIENT_ID", "YOUR_CLIENT_ID_HERE")
        google.client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "YOUR_CLIENT_SECRET_HERE")
        google.enable_social_login = 1
        google.save(ignore_permissions=True)

    frappe.db.commit()
    print("Email Account and Google Social Login Setup completed!")
