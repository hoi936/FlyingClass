import frappe

@frappe.whitelist(allow_guest=True)
def debug_fields():
    return {"fields": [f.fieldname for f in frappe.get_meta("FC Exam Result").fields]}
