import frappe
def execute():
    doc = frappe.get_doc('DocType', 'FC Teacher Profile')
    for field in doc.fields:
        if field.fieldname == 'status':
            field.options = "Not Submitted\nPending\nApproved\nRejected"
            field.default = "Not Submitted"
            break
    doc.save()
    
    # Update existing profiles
    frappe.db.sql("UPDATE `tabFC Teacher Profile` SET status = 'Not Submitted' WHERE status = 'Pending' AND (id_card_image IS NULL OR certificate_image IS NULL)")
    frappe.db.commit()
