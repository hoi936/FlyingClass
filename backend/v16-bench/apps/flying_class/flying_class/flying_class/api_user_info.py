import frappe

@frappe.whitelist(allow_guest=True)
def get_user_info():
    user = frappe.session.user
    if user == 'Guest':
        return {'roles': []}
        
    roles = frappe.get_roles(user)
    user_doc = frappe.get_doc('User', user)
    return {
        'email': user,
        'full_name': user_doc.full_name,
        'roles': roles
    }






