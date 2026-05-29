import frappe
def execute():
    print(frappe.get_all('User', fields=['name', 'email', 'first_name']))
