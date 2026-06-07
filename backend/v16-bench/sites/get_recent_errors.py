import frappe
frappe.init(site="flyingclass.localhost")
frappe.connect()

logs = frappe.get_all("Error Log", limit=10, order_by="creation desc")
for log in logs:
    doc = frappe.get_doc("Error Log", log.name)
    print("="*40)
    print(f"[{doc.creation}] Method: {doc.method}")
    print(doc.error[:1000]) # only print first 1000 chars to avoid getting truncated
