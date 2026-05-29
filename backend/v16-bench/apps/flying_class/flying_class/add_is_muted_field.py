import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def run():
    create_custom_field("FC Class Member", {
        "fieldname": "is_muted",
        "label": "Is Muted",
        "fieldtype": "Check",
        "insert_after": "student",
        "default": "0"
    })
    frappe.db.commit()
    print("Added is_muted field to FC Class Member successfully.")
