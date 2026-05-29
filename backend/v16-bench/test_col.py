import frappe
frappe.init(site='flying_class')
frappe.connect()
print(frappe.db.has_column('User', 'cccd_number'))
