import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def setup():
    # 1. FC Chat Session
    if not frappe.db.exists("DocType", "FC Chat Session"):
        doctype = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC Chat Session",
            "module": "Flying Class",
            "custom": 1,
            "autoname": "format:CHAT-{YYYY}-{MM}-{####}",
            "fields": [
                {
                    "fieldname": "title",
                    "label": "Title",
                    "fieldtype": "Data",
                    "reqd": 1
                },
                {
                    "fieldname": "teacher",
                    "label": "Teacher",
                    "fieldtype": "Link",
                    "options": "User",
                    "reqd": 1,
                    "in_list_view": 1
                }
            ],
            "permissions": [
                {
                    "role": "FC Teacher",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 1,
                    "owner_match": "teacher" # User can only see their own sessions
                }
            ]
        })
        doctype.insert(ignore_permissions=True)
        print("Created FC Chat Session")

    # 2. FC Chat Message
    if not frappe.db.exists("DocType", "FC Chat Message"):
        doctype = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC Chat Message",
            "module": "Flying Class",
            "custom": 1,
            "istable": 1,
            "fields": [
                {
                    "fieldname": "role",
                    "label": "Role",
                    "fieldtype": "Select",
                    "options": "User\nSystem\nAI",
                    "reqd": 1
                },
                {
                    "fieldname": "content",
                    "label": "Content",
                    "fieldtype": "Long Text",
                    "reqd": 1
                }
            ]
        })
        doctype.insert(ignore_permissions=True)
        print("Created FC Chat Message")
        
        # Link FC Chat Message as child table of FC Chat Session
        session_dt = frappe.get_doc("DocType", "FC Chat Session")
        has_messages = False
        for field in session_dt.fields:
            if field.fieldname == "messages":
                has_messages = True
        
        if not has_messages:
            session_dt.append("fields", {
                "fieldname": "messages",
                "label": "Messages",
                "fieldtype": "Table",
                "options": "FC Chat Message"
            })
            session_dt.save(ignore_permissions=True)
            print("Linked FC Chat Message to FC Chat Session")

    # 3. Update FC Question
    custom_fields = {
        "FC Question": [
            dict(fieldname='options_json', label='Options JSON', fieldtype='Long Text', insert_after='correct_option'),
            dict(fieldname='correct_option_index', label='Correct Option Index', fieldtype='Int', default='0', insert_after='options_json'),
        ]
    }
    create_custom_fields(custom_fields)
    print("Updated FC Question fields")
    frappe.db.commit()

