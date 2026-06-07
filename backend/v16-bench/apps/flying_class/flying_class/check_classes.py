import frappe

def run():
    frappe.init(site="flyingclass.localhost", sites_path="sites")
    frappe.connect()
    
    meta = frappe.get_meta("FC AI Token Usage")
    print("FC AI Token Usage fields:")
    for f in meta.fields:
        print(f"Name: {f.fieldname} | Type: {f.fieldtype}")

if __name__ == "__main__":
    run()
