import frappe
def check():
    for x in frappe.get_all("Error Log", fields=["method", "error", "creation"], order_by="creation desc", limit=10):
        print("METHOD:", x.get("method"))
        print("CREATION:", x.get("creation"))
        print("ERROR:", x.get("error"))
        print("="*80)
