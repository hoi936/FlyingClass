import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    
    # Check what fields exist
    meta = frappe.get_meta("FC Exam")
    existing = [f.fieldname for f in meta.fields]
    
    custom_fields = {"FC Exam": []}
    
    if "max_attempts" not in existing:
        custom_fields["FC Exam"].append(
            dict(fieldname="max_attempts", label="Max Attempts", fieldtype="Int", default="1", insert_after="duration")
        )
        
    if custom_fields["FC Exam"]:
        create_custom_fields(custom_fields)
        print("Added max_attempts to FC Exam.")
    else:
        print("max_attempts already exists.")
        
    frappe.db.commit()
        
if __name__ == "__main__":
    run()
