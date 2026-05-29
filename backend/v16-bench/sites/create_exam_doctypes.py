import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def create_doctypes():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()

    # 1. Create FC Exam Question (Child Table)
    if not frappe.db.exists("DocType", "FC Exam Question"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC Exam Question",
            "module": "Flying Class",
            "custom": 1,
            "istable": 1,
            "fields": [
                {"fieldname": "question_text", "fieldtype": "Text", "label": "Question Text", "reqd": 1, "in_list_view": 1},
                {"fieldname": "option_a", "fieldtype": "Data", "label": "Option A", "reqd": 1},
                {"fieldname": "option_b", "fieldtype": "Data", "label": "Option B", "reqd": 1},
                {"fieldname": "option_c", "fieldtype": "Data", "label": "Option C", "reqd": 1},
                {"fieldname": "option_d", "fieldtype": "Data", "label": "Option D", "reqd": 1},
                {"fieldname": "correct_answer", "fieldtype": "Select", "label": "Correct Answer", "options": "A\nB\nC\nD", "reqd": 1, "in_list_view": 1},
            ]
        })
        doc.insert()
        print("Created FC Exam Question")

    # 2. Create FC Exam
    if not frappe.db.exists("DocType", "FC Exam"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC Exam",
            "module": "Flying Class",
            "custom": 1,
            "autoname": "format:EXAM-{YYYY}-{####}",
            "fields": [
                {"fieldname": "exam_name", "fieldtype": "Data", "label": "Exam Name", "reqd": 1, "in_list_view": 1},
                {"fieldname": "class_link", "fieldtype": "Link", "label": "Class", "options": "FC Class", "reqd": 1, "in_list_view": 1},
                {"fieldname": "teacher", "fieldtype": "Link", "label": "Teacher", "options": "User", "in_list_view": 1},
                {"fieldname": "start_time", "fieldtype": "Datetime", "label": "Start Time", "reqd": 1, "in_list_view": 1},
                {"fieldname": "end_time", "fieldtype": "Datetime", "label": "End Time", "reqd": 1, "in_list_view": 1},
                {"fieldname": "duration_minutes", "fieldtype": "Int", "label": "Duration (Minutes)", "reqd": 1},
                {"fieldname": "status", "fieldtype": "Select", "label": "Status", "options": "Scheduled\nCompleted\nCancelled", "default": "Scheduled", "in_list_view": 1},
                {"fieldname": "questions", "fieldtype": "Table", "label": "Questions", "options": "FC Exam Question"}
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Teacher", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Student", "read": 1}
            ]
        })
        doc.insert()
        print("Created FC Exam")
    
    frappe.db.commit()

if __name__ == "__main__":
    create_doctypes()
