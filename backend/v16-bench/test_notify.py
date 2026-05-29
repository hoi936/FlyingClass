import frappe

def execute():
    try:
        doc = frappe.get_doc({
            "doctype": "Notification Log",
            "subject": "Test Notification",
            "for_user": "student1@example.com", # Needs a valid user
            "document_type": "User",
            "document_name": "student1@example.com"
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("Success")
    except Exception as e:
        print(f"Error: {e}")
