import frappe

def run():
    frappe.flags.in_install = True
    
    # Disable password policy
    system_settings = frappe.get_single('System Settings')
    system_settings.enable_password_policy = 0
    system_settings.save(ignore_permissions=True)

    users = [
        {"email": "admin@flyingclass.com", "first_name": "Admin", "role": "FC Admin"},
        {"email": "teacher@flyingclass.com", "first_name": "Teacher", "role": "FC Teacher"},
        {"email": "student@flyingclass.com", "first_name": "Student", "role": "FC Student"}
    ]
    
    for u in users:
        if not frappe.db.exists("User", u["email"]):
            user = frappe.get_doc({
                "doctype": "User",
                "email": u["email"],
                "first_name": u["first_name"],
                "send_welcome_email": 0,
                "new_password": "user"
            })
            user.insert(ignore_permissions=True)
            
            # Gán Role
            user.add_roles(u["role"])
            print(f"Đã tạo user {u['email']} với role {u['role']}")
            
    frappe.db.commit()
    print("XONG! Đã tạo các tài khoản demo.")
