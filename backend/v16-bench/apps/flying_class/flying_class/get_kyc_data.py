import frappe
def execute():
    profiles = frappe.get_all('FC Teacher Profile', fields=['name', 'user', 'id_card_image', 'certificate_image', 'status'])
    print(profiles)
