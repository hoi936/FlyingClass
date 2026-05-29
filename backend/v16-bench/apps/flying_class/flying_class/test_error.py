import frappe
def run():
    logs = frappe.db.get_list("Error Log", limit=1, order_by="creation desc", fields=["error"])
    if logs:
        print(logs[0].error)
    else:
        print("No error logs found")
