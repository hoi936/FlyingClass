import frappe

def run():
    # Find a student user
    students = frappe.get_all("User", filters=[["name", "like", "%@%"]], fields=["name", "email"])
    
    for u in students[:5]:
        roles = frappe.get_roles(u.name)
        if "FC Student" in roles:
            print(f"Student: {u.email}")
            print(f"Roles: {roles}")
            # Simulate get_user_info
            try:
                user_doc = frappe.get_doc("User", u.name)
                print(f"user_doc fields: user_image={user_doc.user_image}, mobile_no={user_doc.mobile_no}")
                print(f"has cccd_number: {hasattr(user_doc, 'cccd_number')}")
            except Exception as e:
                print(f"Error: {e}")
            break
