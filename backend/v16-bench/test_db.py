import sys
import os

sys.path.append("/home/user/Flying_Class/backend/v16-bench/apps/frappe")
os.environ["SITES_PATH"] = "/home/user/Flying_Class/backend/v16-bench/sites"

import frappe
frappe.init(site="flyingclass.localhost", sites_path="/home/user/Flying_Class/backend/v16-bench/sites")
frappe.connect()

teacher = "nhanaiainhan49@gmail.com"
classes = frappe.get_all("FC Class", filters={"teacher": teacher}, fields=["name as id", "class_name as name"])
print("Classes:", classes)

class_ids = [c.id for c in classes]
if class_ids:
    filters = {"parent": ["in", class_ids]}
    students = frappe.get_all("FC Class Member", filters=filters, fields=["student", "parent", "join_date"], order_by="creation asc")
    print("Students:", students)
else:
    print("No classes found.")

frappe.destroy()
