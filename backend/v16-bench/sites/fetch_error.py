import frappe

def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    
    error = frappe.get_last_doc("Error Log")
    if error:
        print("LAST ERROR:")
        print(error.error)
    else:
        print("No errors.")
        
if __name__ == "__main__":
    run()
