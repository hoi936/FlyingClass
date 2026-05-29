import frappe

def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    user = frappe.db.get_value("User", {"email": ["like", "%teacher%"]}, "name")
    if not user:
        print("No teacher found")
        return
        
    frappe.session.user = user
    from flying_class.flying_class.api import get_teacher_statistics
    res = get_teacher_statistics()
    print("User:", user)
    print("Result:", res)

if __name__ == "__main__":
    run()
