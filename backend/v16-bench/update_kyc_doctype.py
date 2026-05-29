import sys
sys.path.insert(0, '/home/user/Flying_Class/backend/v16-bench/apps/frappe')
import frappe

frappe.init(site='flyingclass.localhost', sites_path='sites')
frappe.connect()

doc = frappe.get_doc("DocType", "FC Teacher Profile")
fields_to_add = [
    {"fieldname": "kyc_section", "fieldtype": "Section Break", "label": "KYC Documents"},
    {"fieldname": "id_card_image", "fieldtype": "Attach Image", "label": "ID Card (CCCD)"},
    {"fieldname": "certificate_image", "fieldtype": "Attach Image", "label": "Teaching Certificate"},
    {"fieldname": "rejection_reason", "fieldtype": "Data", "label": "Rejection Reason", "depends_on": "eval:doc.status=='Rejected'"}
]

existing_fields = [f.fieldname for f in doc.fields]
for field in fields_to_add:
    if field["fieldname"] not in existing_fields:
        doc.append("fields", field)

doc.save()
frappe.db.commit()
print("FC Teacher Profile DocType updated successfully!")
