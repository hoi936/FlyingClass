import frappe

def main():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    
    for code in ["CLSA6EFB5", "CLSFEGLP1", "CLSX1TJ5S", "tOAN123", "TOAN10"]:
        name = frappe.db.get_value("FC Class", {"class_code": code}, "name")
        print(f"Code: {code} -> Doc Name: {name}")

if __name__ == "__main__":
    main()
