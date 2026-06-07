import frappe

def main():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    frappe.set_user("gaxit72567@dosbee.com")
    
    from flying_class.flying_class.api import get_student_overview
    res = get_student_overview()
    import json
    print(json.dumps(res, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
