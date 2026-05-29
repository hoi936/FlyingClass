import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def run():
    frappe.flags.in_install = True
    create_roles()
    setup_email()
    setup_google_oauth()
    create_doctypes()
    frappe.db.commit()
    print("XONG! Đã thiết lập Role, Email, Google OAuth và các DocTypes cốt lõi.")

def create_roles():
    roles = ['FC Admin', 'FC Teacher', 'FC Student']
    for role in roles:
        if not frappe.db.exists('Role', role):
            frappe.get_doc({
                'doctype': 'Role',
                'role_name': role,
                'desk_access': 1 if role == 'FC Admin' else 0
            }).insert(ignore_permissions=True)

def setup_email():
    try:
        if not frappe.db.exists('Email Domain', 'gmail.com'):
            frappe.get_doc({
                'doctype': 'Email Domain',
                'domain_name': 'gmail.com',
                'append_emails_to_sent_folder': 1,
                'email_server': 'imap.gmail.com',
                'use_imap': 1,
                'smtp_server': 'smtp.gmail.com',
                'use_tls': 1,
                'smtp_port': 587
            }).insert(ignore_permissions=True)

        if not frappe.db.exists('Email Account', 'phandinhhoi2709@gmail.com'):
            frappe.get_doc({
                'doctype': 'Email Account',
                'email_id': 'phandinhhoi2709@gmail.com',
                'password': 'ytqdueboiqnfybvq',
                'email_account_name': 'FlyingClass Mailer',
                'domain': 'gmail.com',
                'enable_outgoing': 1,
                'default_outgoing': 1
            }).insert(ignore_permissions=True)
    except Exception as e:
        print(f"Error setting up email: {e}")

def setup_google_oauth():
    import os
    try:
        if not frappe.db.exists('Social Login Key', 'google'):
            doc = frappe.get_doc({
                'doctype': 'Social Login Key',
                'provider_name': 'Google',
                'enable_social_login': 1,
                'client_id': os.environ.get('GOOGLE_CLIENT_ID', 'YOUR_CLIENT_ID_HERE'),
                'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET', 'YOUR_CLIENT_SECRET_HERE'),
                'base_url': 'https://www.googleapis.com',
                'authorize_url': 'https://accounts.google.com/o/oauth2/auth',
                'access_token_url': 'https://accounts.google.com/o/oauth2/token',
                'redirect_url': '/api/method/frappe.integrations.oauth2_logins.login_via_google',
                'api_endpoint': 'oauth2/v2/userinfo',
                'api_endpoint_args': '',
                'auth_url_data': '{"response_type": "code", "scope": "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"}',
                'user_id_property': 'email',
                'icon': 'google'
            })
            doc.insert(ignore_permissions=True)
    except Exception as e:
        print(f"Error setting up google oauth: {e}")

def create_doctypes():
    doctypes = [
        # 1. Teacher Profile
        {
            "doctype": "DocType",
            "name": "FC Teacher Profile",
            "module": "Flying Class",
            "custom": 1,
            "autoname": "format:TCP-{YYYY}-{####}",
            "fields": [
                {"fieldname": "user", "label": "User", "fieldtype": "Link", "options": "User", "reqd": 1, "unique": 1},
                {"fieldname": "full_name", "label": "Full Name", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "identify_card", "label": "Identity Card", "fieldtype": "Attach"},
                {"fieldname": "certificates", "label": "Certificates", "fieldtype": "Attach"},
                {"fieldname": "status", "label": "Status", "fieldtype": "Select", "options": "Pending\nApproved\nRejected", "default": "Pending"}
            ],
            "permissions": [{"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
        },
        # 2. Class Member (Child Table)
        {
            "doctype": "DocType",
            "name": "FC Class Member",
            "module": "Flying Class",
            "custom": 1,
            "istable": 1,
            "fields": [
                {"fieldname": "student", "label": "Student", "fieldtype": "Link", "options": "User", "in_list_view": 1},
                {"fieldname": "join_date", "label": "Join Date", "fieldtype": "Date", "default": "Today"}
            ]
        },
        # 3. Class
        {
            "doctype": "DocType",
            "name": "FC Class",
            "module": "Flying Class",
            "custom": 1,
            "autoname": "format:CLS-{YYYY}-{####}",
            "fields": [
                {"fieldname": "class_name", "label": "Class Name", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "class_code", "label": "Class Code", "fieldtype": "Data", "unique": 1, "reqd": 1},
                {"fieldname": "teacher", "label": "Teacher", "fieldtype": "Link", "options": "User"},
                {"fieldname": "price", "label": "Price", "fieldtype": "Currency"},
                {"fieldname": "status", "label": "Status", "fieldtype": "Select", "options": "Active\nHidden", "default": "Active"},
                {"fieldname": "description", "label": "Description", "fieldtype": "Text Editor"},
                {"fieldname": "students", "label": "Students", "fieldtype": "Table", "options": "FC Class Member"}
            ],
            "permissions": [{"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
        },
        # 4. Lesson
        {
            "doctype": "DocType",
            "name": "FC Lesson",
            "module": "Flying Class",
            "custom": 1,
            "autoname": "format:LSN-{YYYY}-{####}",
            "fields": [
                {"fieldname": "title", "label": "Title", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "class_ref", "label": "Class", "fieldtype": "Link", "options": "FC Class", "reqd": 1},
                {"fieldname": "video_url", "label": "Video URL", "fieldtype": "Data"},
                {"fieldname": "content", "label": "Content", "fieldtype": "Text Editor"},
                {"fieldname": "attachment", "label": "Attachment", "fieldtype": "Attach"}
            ],
            "permissions": [{"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
        },
        # 5. Question (Child Table)
        {
            "doctype": "DocType",
            "name": "FC Question",
            "module": "Flying Class",
            "custom": 1,
            "istable": 1,
            "fields": [
                {"fieldname": "question_text", "label": "Question", "fieldtype": "Text"},
                {"fieldname": "option_a", "label": "Option A", "fieldtype": "Data"},
                {"fieldname": "option_b", "label": "Option B", "fieldtype": "Data"},
                {"fieldname": "option_c", "label": "Option C", "fieldtype": "Data"},
                {"fieldname": "option_d", "label": "Option D", "fieldtype": "Data"},
                {"fieldname": "correct_option", "label": "Correct Option", "fieldtype": "Select", "options": "A\nB\nC\nD"}
            ]
        },
        # 6. Exam
        {
            "doctype": "DocType",
            "name": "FC Exam",
            "module": "Flying Class",
            "custom": 1,
            "autoname": "format:EXM-{YYYY}-{####}",
            "fields": [
                {"fieldname": "title", "label": "Title", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "class_ref", "label": "Class", "fieldtype": "Link", "options": "FC Class", "reqd": 1},
                {"fieldname": "duration", "label": "Duration (Minutes)", "fieldtype": "Int"},
                {"fieldname": "questions", "label": "Questions", "fieldtype": "Table", "options": "FC Question"}
            ],
            "permissions": [{"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
        },
        # 7. Submission
        {
            "doctype": "DocType",
            "name": "FC Submission",
            "module": "Flying Class",
            "custom": 1,
            "autoname": "format:SUB-{YYYY}-{####}",
            "fields": [
                {"fieldname": "exam_ref", "label": "Exam", "fieldtype": "Link", "options": "FC Exam", "reqd": 1},
                {"fieldname": "student", "label": "Student", "fieldtype": "Link", "options": "User", "reqd": 1},
                {"fieldname": "answers_json", "label": "Answers (JSON)", "fieldtype": "Code", "options": "JSON"},
                {"fieldname": "score", "label": "Score", "fieldtype": "Float"},
                {"fieldname": "teacher_comment", "label": "Teacher Comment", "fieldtype": "Text"}
            ],
            "permissions": [{"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
        }
    ]

    for dt in doctypes:
        if not frappe.db.exists("DocType", dt["name"]):
            frappe.get_doc(dt).insert(ignore_permissions=True)
