import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    
    # Check what fields exist
    meta = frappe.get_meta("FC Exam")
    existing = [f.fieldname for f in meta.fields]
    
    custom_fields = {"FC Exam": []}
    
    if "start_time" not in existing:
        custom_fields["FC Exam"].append(
            dict(fieldname="start_time", label="Start Time", fieldtype="Datetime", insert_after="class_ref")
        )
    if "end_time" not in existing:
        custom_fields["FC Exam"].append(
            dict(fieldname="end_time", label="End Time", fieldtype="Datetime", insert_after="start_time")
        )
    if "status" not in existing:
        custom_fields["FC Exam"].append(
            dict(fieldname="status", label="Status", fieldtype="Select", options="Scheduled\nCompleted", default="Scheduled", insert_after="duration")
        )
        
    if custom_fields["FC Exam"]:
        create_custom_fields(custom_fields)
        print("Added missing fields to FC Exam.")
    else:
        print("Fields already exist.")
        
    frappe.db.commit()
        
if __name__ == "__main__":
    run()
