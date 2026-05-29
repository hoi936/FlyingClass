import frappe

def setup():
    if not frappe.db.exists("DocType", "FC System Settings"):
        doctype = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC System Settings",
            "module": "Flying Class",
            "custom": 1,
            "issingle": 1,
            "fields": [
                {
                    "fieldname": "maintenance_mode",
                    "label": "Maintenance Mode",
                    "fieldtype": "Check",
                    "default": "0"
                }
            ],
            "permissions": [
                {
                    "role": "FC Admin",
                    "read": 1,
                    "write": 1
                }
            ]
        })
        doctype.insert(ignore_permissions=True)
        
        # Initialize single value
        settings = frappe.get_single("FC System Settings")
        settings.maintenance_mode = 0
        settings.save(ignore_permissions=True)
        frappe.db.commit()
        print("Created FC System Settings doctype.")
    else:
        print("Doctype already exists.")

