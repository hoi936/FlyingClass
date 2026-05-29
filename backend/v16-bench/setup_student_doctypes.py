import frappe

def setup():
    # 1. Modify FC Class to add class_code
    fc_class = frappe.get_doc("DocType", "FC Class")
    fields = fc_class.get("fields")
    has_class_code = any(f.fieldname == "class_code" for f in fields)
    if not has_class_code:
        # Add after some field, e.g. class_name
        idx = next((i for i, f in enumerate(fields) if f.fieldname == "class_name"), 0)
        fields.insert(idx + 1, frappe._dict({
            "fieldname": "class_code",
            "label": "Class Code",
            "fieldtype": "Data",
            "unique": 1,
            "in_list_view": 1
        }))
        fc_class.save()
        print("Added class_code to FC Class")
    
    # 2. Create FC Exam Result
    if not frappe.db.exists("DocType", "FC Exam Result"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC Exam Result",
            "module": "Flying Class",
            "custom": 0,
            "autoname": "format:RES-{YY}-{MM}-{#####}",
            "fields": [
                {"fieldname": "student", "label": "Student", "fieldtype": "Link", "options": "User", "reqd": 1, "in_list_view": 1},
                {"fieldname": "exam", "label": "Exam", "fieldtype": "Link", "options": "FC Exam", "reqd": 1, "in_list_view": 1},
                {"fieldname": "class_ref", "label": "Class", "fieldtype": "Link", "options": "FC Class", "reqd": 1, "in_list_view": 1},
                {"fieldname": "score", "label": "Score", "fieldtype": "Float", "in_list_view": 1},
                {"fieldname": "correct_answers", "label": "Correct Answers", "fieldtype": "Int"},
                {"fieldname": "total_questions", "label": "Total Questions", "fieldtype": "Int"},
                {"fieldname": "submission_data", "label": "Submission Data", "fieldtype": "JSON"},
                {"fieldname": "status", "label": "Status", "fieldtype": "Select", "options": "Submitted\nGraded", "default": "Submitted"},
                {"fieldname": "teacher_feedback", "label": "Teacher Feedback", "fieldtype": "Text Editor"}
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "All", "read": 1, "write": 1, "create": 1}
            ]
        })
        doc.insert()
        print("Created FC Exam Result")
    
    # 3. Create FC Message
    if not frappe.db.exists("DocType", "FC Message"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC Message",
            "module": "Flying Class",
            "custom": 0,
            "autoname": "format:MSG-{YY}-{MM}-{#####}",
            "fields": [
                {"fieldname": "class_ref", "label": "Class", "fieldtype": "Link", "options": "FC Class", "reqd": 1, "in_list_view": 1},
                {"fieldname": "sender", "label": "Sender", "fieldtype": "Link", "options": "User", "reqd": 1, "in_list_view": 1},
                {"fieldname": "content", "label": "Content", "fieldtype": "Text", "reqd": 1},
                {"fieldname": "timestamp", "label": "Timestamp", "fieldtype": "Datetime", "default": "Now"}
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "All", "read": 1, "write": 1, "create": 1}
            ]
        })
        doc.insert()
        print("Created FC Message")
        
setup()
