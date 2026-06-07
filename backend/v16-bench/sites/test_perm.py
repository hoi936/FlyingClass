import frappe
frappe.init(site="flyingclass.localhost")
frappe.connect()

frappe.set_user("nhanaiainhan49@gmail.com")
print("Has permission on FC Class CLS-2026-0016?", frappe.has_permission("FC Class", "read", "CLS-2026-0016"))
print("Has permission on FC Chapter CHP-2026-0002?", frappe.has_permission("FC Chapter", "read", "CHP-2026-0002"))
