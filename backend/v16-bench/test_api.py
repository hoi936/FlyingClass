import frappe

def execute():
    for u in ['admin@flyingclass.com', 'teacher@flyingclass.com', 'student@flyingclass.com']:
        frappe.set_user(u)
        print(f'\n--- Testing for {u} ---')
        try:
            from flying_class.flying_class.api import get_my_classes
            print(get_my_classes())
        except Exception as e:
            print(f'ERROR: {e}')
