import frappe
def run():
    logs = frappe.db.get_list("Error Log", limit=2, order_by="creation desc")
    for l in logs:
        doc = frappe.get_doc("Error Log", l.name)
        print("==========")
        print(doc.error)
