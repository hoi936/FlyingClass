import frappe
frappe.init(site="flyingclass.localhost")
frappe.connect()

users = frappe.get_all("User", fields=["name", "full_name"])
for u in users:
    if "das" in u.full_name.lower() or "teacher" in u.full_name.lower():
        user_doc = frappe.get_doc("User", u.name)
        roles = [r.role for r in user_doc.roles]
        print(f"User: {u.full_name} ({u.name}) - Roles: {roles}")

# print last 5 users created
users = frappe.get_all("User", fields=["name", "full_name"], order_by="creation desc", limit=5)
for u in users:
    user_doc = frappe.get_doc("User", u.name)
    roles = [r.role for r in user_doc.roles]
    print(f"Recent User: {u.full_name} ({u.name}) - Roles: {roles}")
