import frappe

frappe.init(site="flyingclass.localhost")
frappe.connect()

logs = frappe.get_all("Error Log", limit=1, order_by="creation desc")
if logs:
    doc = frappe.get_doc("Error Log", logs[0].name)
    print(doc.error)
else:
    print("No errors found.")
