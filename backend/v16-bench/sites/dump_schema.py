import frappe
def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    
    fields = frappe.get_meta("FC Exam").fields
    for f in fields:
        print(f.fieldname, f.fieldtype, f.reqd)
        
if __name__ == "__main__":
    run()
