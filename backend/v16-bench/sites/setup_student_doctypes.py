import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def setup():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()

    # 1. Add class_code to FC Class
    meta = frappe.get_meta("FC Class")
    existing_fields = [f.fieldname for f in meta.fields]
    if "class_code" not in existing_fields:
        create_custom_fields({
            "FC Class": [
                dict(fieldname="class_code", label="Class Code", fieldtype="Data", unique=1, insert_after="class_name")
            ]
        })
        print("Added class_code to FC Class")

    # 2. Create FC Exam Result DocType
    if not frappe.db.exists("DocType", "FC Exam Result"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC Exam Result",
            "module": "Flying Class",
            "custom": 1,
            "autoname": "format:RES-{YYYY}-{####}",
            "fields": [
                {"fieldname": "student", "fieldtype": "Link", "label": "Student", "options": "User", "reqd": 1, "in_list_view": 1},
                {"fieldname": "exam_ref", "fieldtype": "Link", "label": "Exam", "options": "FC Exam", "reqd": 1, "in_list_view": 1},
                {"fieldname": "class_ref", "fieldtype": "Link", "label": "Class", "options": "FC Class", "reqd": 1},
                {"fieldname": "total_questions", "fieldtype": "Int", "label": "Total Questions", "reqd": 1},
                {"fieldname": "correct_answers", "fieldtype": "Int", "label": "Correct Answers", "reqd": 1},
                {"fieldname": "score", "fieldtype": "Float", "label": "Score (out of 10)", "reqd": 1, "in_list_view": 1},
                {"fieldname": "submitted_at", "fieldtype": "Datetime", "label": "Submitted At", "reqd": 1, "in_list_view": 1}
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Teacher", "read": 1, "write": 1},
                {"role": "FC Student", "read": 1, "create": 1}
            ]
        })
        doc.insert()
        print("Created FC Exam Result DocType")

    frappe.db.commit()

if __name__ == "__main__":
    setup()
