import frappe

def execute():
    logs = frappe.db.get_list("Error Log", fields=["method", "error"], limit=1, order_by="creation desc")
    if logs:
        print(logs[0].error)
    else:
        print("No logs")
