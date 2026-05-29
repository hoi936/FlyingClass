import frappe

def run():
    import os
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "YOUR_CLIENT_ID_HERE")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "YOUR_CLIENT_SECRET_HERE")
    
    # Check if Google Social Login Key exists
    if frappe.db.exists("Social Login Key", "google"):
        doc = frappe.get_doc("Social Login Key", "google")
        doc.client_id = client_id
        doc.client_secret = client_secret
        doc.enable_social_login = 1
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.new_doc("Social Login Key")
        doc.provider_name = "google"
        doc.client_id = client_id
        doc.client_secret = client_secret
        doc.enable_social_login = 1
        
        # Standard endpoints for Google
        doc.base_url = "https://www.googleapis.com"
        doc.authorize_url = "https://accounts.google.com/o/oauth2/auth"
        doc.access_token_url = "https://accounts.google.com/o/oauth2/token"
        doc.redirect_url = "/api/method/frappe.integrations.oauth2_logins.login_via_google"
        doc.api_endpoint = "oauth2/v2/userinfo"
        doc.auth_url_data = '{"scope": "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"}'
        
        doc.insert(ignore_permissions=True)
    
    frappe.db.commit()
    print("Google Social Login Key configured successfully.")
