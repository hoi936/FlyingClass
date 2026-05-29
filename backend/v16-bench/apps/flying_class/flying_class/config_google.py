import frappe

def run():
    if frappe.db.exists('Social Login Key', 'google'):
        doc = frappe.get_doc('Social Login Key', 'google')
    else:
        doc = frappe.new_doc('Social Login Key')
        doc.provider_name = 'google'
        doc.custom_base_url = 0

    doc.enable_social_login = 1
    import os
    doc.client_id = os.environ.get('GOOGLE_CLIENT_ID', 'YOUR_CLIENT_ID_HERE')
    doc.client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', 'YOUR_CLIENT_SECRET_HERE')
    doc.base_url = 'https://www.googleapis.com'
    doc.authorize_url = 'https://accounts.google.com/o/oauth2/auth'
    doc.access_token_url = 'https://oauth2.googleapis.com/token'
    doc.redirect_url = '/api/method/frappe.integrations.oauth2_logins.login_via_google'
    doc.api_endpoint = 'oauth2/v2/userinfo'
    doc.auth_url_data = '{"response_type": "code", "scope": "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"}'
    
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    print('Google Login Configured')
