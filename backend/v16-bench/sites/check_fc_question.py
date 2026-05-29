import frappe
def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    
    meta = frappe.get_meta("FC Question")
    for f in meta.fields:
        print(f.fieldname, f.fieldtype, f.reqd)
        
if __name__ == "__main__":
    run()
