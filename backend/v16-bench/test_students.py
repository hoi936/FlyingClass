import frappe

def test():
    frappe.init(site="flyingclass.localhost")
    frappe.connect()
    frappe.set_user("admin@example.com") # Or whatever teacher user is
    
    # Let's find a teacher user
    teachers = frappe.get_all("FC Teacher Profile", fields=["user"])
    if not teachers:
        print("No teachers found.")
        return
    
    teacher_email = teachers[0].user
    print(f"Testing for teacher: {teacher_email}")
    frappe.set_user(teacher_email)
    
    try:
        from flying_class.flying_class.api import get_global_students
        res = get_global_students()
        print("Result:", res)
    except Exception as e:
        print("Error:", e)
        
    frappe.destroy()

test()
