import frappe
frappe.init(site="flyingclass.localhost")
frappe.connect()

logs = frappe.get_all("Error Log", limit=100, order_by="creation desc")
found = False
for log in logs:
    doc = frappe.get_doc("Error Log", log.name)
    if "CLS-2026-0016" in str(doc.error) or "FC Lesson" in str(doc.error) or "hàm số" in str(doc.error):
        print(f"[{doc.creation}] Method: {doc.method}")
        print(doc.error)
        print("="*40)
        found = True

if not found:
    print("Not found in the last 100 error logs.")
