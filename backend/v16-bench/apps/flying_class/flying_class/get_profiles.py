import frappe
def execute():
    print(frappe.get_all('FC Teacher Profile', fields=['name', 'user']))
