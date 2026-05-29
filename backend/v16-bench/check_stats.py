import frappe

frappe.init(site=flyingclass.localhost)
frappe.connect()

frappe.session.user = teacher@test.com

monthly_data_raw = frappe.db.sql(
