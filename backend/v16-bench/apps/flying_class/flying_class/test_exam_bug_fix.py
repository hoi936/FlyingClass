import frappe

def run():
    dt = frappe.get_doc("DocType", "FC Chat Message")
    if dt.istable:
        dt.istable = 0
        dt.save(ignore_permissions=True)
        print("Reverted FC Chat Message back to istable = 0")
    else:
        print("FC Chat Message is already istable = 0")
        
    frappe.clear_cache()
