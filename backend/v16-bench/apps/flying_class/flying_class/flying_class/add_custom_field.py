import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def add_user_custom_fields():
    create_custom_field("User", {
        "fieldname": "cccd_number",
        "label": "CCCD/CMND Number",
        "fieldtype": "Data",
        "insert_after": "mobile_no"
    })
    frappe.db.commit()
    print("Added cccd_number to User")
