import frappe
frappe.init(site="flyingclass.localhost", sites_path="sites")
frappe.connect()
for x in frappe.get_all("Error Log", fields=["method", "traceback", "creation"], order_by="creation desc", limit=3):
    print("METHOD:", x.get("method"))
    print("CREATION:", x.get("creation"))
    print("TRACEBACK:", x.get("traceback"))
    print("="*80)
