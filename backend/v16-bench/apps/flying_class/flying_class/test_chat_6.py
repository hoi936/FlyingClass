import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def run():
    # 1. Create FC AI Chat Message
    if not frappe.db.exists("DocType", "FC AI Chat Message"):
        doctype = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC AI Chat Message",
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
        print("Created FC AI Chat Message")
    else:
        # ensure istable is 1
        dt = frappe.get_doc("DocType", "FC AI Chat Message")
        if not dt.istable:
            dt.istable = 1
            dt.save()
            
    # 2. Update FC Chat Session to use FC AI Chat Message
    session_dt = frappe.get_doc("DocType", "FC Chat Session")
    field_updated = False
    for field in session_dt.fields:
        if field.fieldname == "messages":
            field.options = "FC AI Chat Message"
            field_updated = True
            
    if field_updated:
        session_dt.save(ignore_permissions=True)
        print("Updated FC Chat Session messages field to point to FC AI Chat Message")
    else:
        # If field doesn't exist, we can't update it like this easily if it's a custom field.
        # Custom fields are stored in Custom Field doctype
        pass
        
    cf = frappe.db.exists("Custom Field", {"dt": "FC Chat Session", "fieldname": "messages"})
    if cf:
        custom_field = frappe.get_doc("Custom Field", cf)
        custom_field.options = "FC AI Chat Message"
        custom_field.save(ignore_permissions=True)
        print("Updated Custom Field to point to FC AI Chat Message")
        
    frappe.clear_cache()
    print("Cache cleared")
