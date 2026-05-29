import frappe

def run():
    frappe.flags.in_install = True
    doctypes = [
        "FC Teacher Profile",
        "FC Class Member",
        "FC Class",
        "FC Lesson",
        "FC Question",
        "FC Exam",
        "FC Submission"
    ]
    
    # Xóa các custom doctype bị tạo nhầm
    for dt in doctypes:
        if frappe.db.exists("DocType", dt):
            frappe.delete_doc("DocType", dt, ignore_permissions=True, force=True)
            
    create_standard_doctypes()
    frappe.db.commit()
    print("XONG! Đã tạo các Standard DocType và xuất file ra thư mục code.")

def create_standard_doctypes():
    doctypes = [
        # 1. Teacher Profile
        {
            "doctype": "DocType",
            "name": "FC Teacher Profile",
            "module": "Flying Class",
            "custom": 0,
            "autoname": "format:TCP-{YYYY}-{####}",
            "fields": [
                {"fieldname": "user", "label": "User", "fieldtype": "Link", "options": "User", "reqd": 1, "unique": 1},
                {"fieldname": "full_name", "label": "Full Name", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "identify_card", "label": "Identity Card", "fieldtype": "Attach"},
                {"fieldname": "certificates", "label": "Certificates", "fieldtype": "Attach"},
                {"fieldname": "status", "label": "Status", "fieldtype": "Select", "options": "Pending\nApproved\nRejected", "default": "Pending"}
            ],
            "permissions": [{"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
        },
        # 2. Class Member (Child Table)
        {
            "doctype": "DocType",
            "name": "FC Class Member",
            "module": "Flying Class",
            "custom": 0,
            "istable": 1,
            "fields": [
                {"fieldname": "student", "label": "Student", "fieldtype": "Link", "options": "User", "in_list_view": 1},
                {"fieldname": "join_date", "label": "Join Date", "fieldtype": "Date", "default": "Today"}
            ]
        },
        # 3. Class
        {
            "doctype": "DocType",
            "name": "FC Class",
            "module": "Flying Class",
            "custom": 0,
            "autoname": "format:CLS-{YYYY}-{####}",
            "fields": [
                {"fieldname": "class_name", "label": "Class Name", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "class_code", "label": "Class Code", "fieldtype": "Data", "unique": 1, "reqd": 1},
                {"fieldname": "teacher", "label": "Teacher", "fieldtype": "Link", "options": "User"},
                {"fieldname": "price", "label": "Price", "fieldtype": "Currency"},
                {"fieldname": "status", "label": "Status", "fieldtype": "Select", "options": "Active\nHidden", "default": "Active"},
                {"fieldname": "description", "label": "Description", "fieldtype": "Text Editor"},
                {"fieldname": "students", "label": "Students", "fieldtype": "Table", "options": "FC Class Member"}
            ],
            "permissions": [{"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
        },
        # 4. Lesson
        {
            "doctype": "DocType",
            "name": "FC Lesson",
            "module": "Flying Class",
            "custom": 0,
            "autoname": "format:LSN-{YYYY}-{####}",
            "fields": [
                {"fieldname": "title", "label": "Title", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "class_ref", "label": "Class", "fieldtype": "Link", "options": "FC Class", "reqd": 1},
                {"fieldname": "video_url", "label": "Video URL", "fieldtype": "Data"},
                {"fieldname": "content", "label": "Content", "fieldtype": "Text Editor"},
                {"fieldname": "attachment", "label": "Attachment", "fieldtype": "Attach"}
            ],
            "permissions": [{"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
        },
        # 5. Question (Child Table)
        {
            "doctype": "DocType",
            "name": "FC Question",
            "module": "Flying Class",
            "custom": 0,
            "istable": 1,
            "fields": [
                {"fieldname": "question_text", "label": "Question", "fieldtype": "Text"},
                {"fieldname": "option_a", "label": "Option A", "fieldtype": "Data"},
                {"fieldname": "option_b", "label": "Option B", "fieldtype": "Data"},
                {"fieldname": "option_c", "label": "Option C", "fieldtype": "Data"},
                {"fieldname": "option_d", "label": "Option D", "fieldtype": "Data"},
                {"fieldname": "correct_option", "label": "Correct Option", "fieldtype": "Select", "options": "A\nB\nC\nD"}
            ]
        },
        # 6. Exam
        {
            "doctype": "DocType",
            "name": "FC Exam",
            "module": "Flying Class",
            "custom": 0,
            "autoname": "format:EXM-{YYYY}-{####}",
            "fields": [
                {"fieldname": "title", "label": "Title", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "class_ref", "label": "Class", "fieldtype": "Link", "options": "FC Class", "reqd": 1},
                {"fieldname": "duration", "label": "Duration (Minutes)", "fieldtype": "Int"},
                {"fieldname": "questions", "label": "Questions", "fieldtype": "Table", "options": "FC Question"}
            ],
            "permissions": [{"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
        },
        # 7. Submission
        {
            "doctype": "DocType",
            "name": "FC Submission",
            "module": "Flying Class",
            "custom": 0,
            "autoname": "format:SUB-{YYYY}-{####}",
            "fields": [
                {"fieldname": "exam_ref", "label": "Exam", "fieldtype": "Link", "options": "FC Exam", "reqd": 1},
                {"fieldname": "student", "label": "Student", "fieldtype": "Link", "options": "User", "reqd": 1},
                {"fieldname": "answers_json", "label": "Answers (JSON)", "fieldtype": "Code", "options": "JSON"},
                {"fieldname": "score", "label": "Score", "fieldtype": "Float"},
                {"fieldname": "teacher_comment", "label": "Teacher Comment", "fieldtype": "Text"}
            ],
            "permissions": [{"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}]
        }
    ]

    for dt in doctypes:
        if not frappe.db.exists("DocType", dt["name"]):
            frappe.get_doc(dt).insert(ignore_permissions=True)
