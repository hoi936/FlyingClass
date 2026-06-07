import frappe

frappe.init(site="flyingclass.localhost")
frappe.connect()

user = frappe.get_doc("User", "ghjk@gmail.com")
print([r.role for r in user.roles])
