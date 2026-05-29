import frappe

def run():
    if not frappe.db.exists("DocType", "FC Chat Message"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "module": "Flying Class",
            "custom": 1,
            "name": "FC Chat Message",
            "autoname": "format:CHAT-{####}",
            "fields": [
                {
                    "fieldname": "class_ref",
                    "fieldtype": "Link",
                    "label": "Class",
                    "options": "FC Class",
                    "reqd": 1
                },
                {
                    "fieldname": "sender",
                    "fieldtype": "Link",
                    "label": "Sender",
                    "options": "User",
                    "reqd": 1
                },
                {
                    "fieldname": "is_teacher",
                    "fieldtype": "Check",
                    "label": "Is Teacher",
                    "default": 0
                },
                {
                    "fieldname": "message",
                    "fieldtype": "Text",
                    "label": "Message",
                    "reqd": 1
                }
            ],
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1, "write": 1, "create": 1, "delete": 1
                },
                {
                    "role": "FC Admin",
                    "read": 1, "delete": 1
                },
                {
                    "role": "FC Teacher",
                    "read": 1, "create": 1
                },
                {
                    "role": "FC Student",
                    "read": 1, "create": 1
                }
            ]
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("DocType FC Chat Message created successfully.")
    else:
        print("DocType FC Chat Message already exists.")
