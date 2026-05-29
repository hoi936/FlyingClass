import frappe

def test():
    try:
        frappe.session.user = "Administrator"
        frappe.delete_doc("User", "giaovien1@gmail.com", ignore_permissions=True)
    except Exception as e:
        import traceback
        traceback.print_exc()
