import frappe

def create_doctypes():
    frappe.flags.in_test = True

    # 1. FC Chapter
    if not frappe.db.exists("DocType", "FC Chapter"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "module": "Flying Class",
            "name": "FC Chapter",
            "custom": 1,
            "autoname": "CHP-.YYYY.-.####",
            "fields": [
                {"fieldname": "chapter_name", "label": "Tên chương", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "class_ref", "label": "Lớp học", "fieldtype": "Link", "options": "FC Class", "reqd": 1, "in_list_view": 1},
                {"fieldname": "order_idx", "label": "Thứ tự", "fieldtype": "Int", "default": "1"},
                {"fieldname": "description", "label": "Mô tả", "fieldtype": "Text Editor"}
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Teacher", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Student", "read": 1}
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created FC Chapter")

    # 2. Update FC Lesson
    lesson_doctype = frappe.get_doc("DocType", "FC Lesson")
    has_chapter = any(f.fieldname == 'chapter_ref' for f in lesson_doctype.fields)
    if not has_chapter:
        lesson_doctype.append("fields", {"fieldname": "chapter_ref", "label": "Chương", "fieldtype": "Link", "options": "FC Chapter", "insert_after": "title"})
        lesson_doctype.append("fields", {"fieldname": "order_idx", "label": "Thứ tự", "fieldtype": "Int", "default": "1", "insert_after": "chapter_ref"})
        lesson_doctype.append("fields", {"fieldname": "document_url", "label": "Link Tài Liệu (PDF/Doc)", "fieldtype": "Data", "insert_after": "video_url"})
        lesson_doctype.save(ignore_permissions=True)
        print("Updated FC Lesson")

    # 3. FC Chapter Test
    if not frappe.db.exists("DocType", "FC Chapter Test"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "module": "Flying Class",
            "name": "FC Chapter Test",
            "custom": 1,
            "autoname": "CHT-.YYYY.-.####",
            "fields": [
                {"fieldname": "title", "label": "Tên bài kiểm tra", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "chapter_ref", "label": "Chương", "fieldtype": "Link", "options": "FC Chapter", "reqd": 1, "in_list_view": 1},
                {"fieldname": "pass_score", "label": "Điểm qua môn (số câu đúng)", "fieldtype": "Int", "default": "5"},
                {"fieldname": "status", "label": "Trạng thái", "fieldtype": "Select", "options": "Open\nClosed", "default": "Open"},
                {"fieldname": "questions", "label": "Câu hỏi", "fieldtype": "Table", "options": "FC Question"}
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Teacher", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Student", "read": 1}
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created FC Chapter Test")

    # 4. FC Chapter Progress
    if not frappe.db.exists("DocType", "FC Chapter Progress"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "module": "Flying Class",
            "name": "FC Chapter Progress",
            "custom": 1,
            "autoname": "PRG-.YYYY.-.####",
            "fields": [
                {"fieldname": "student", "label": "Học sinh", "fieldtype": "Link", "options": "User", "reqd": 1},
                {"fieldname": "class_ref", "label": "Lớp học", "fieldtype": "Link", "options": "FC Class", "reqd": 1},
                {"fieldname": "chapter_ref", "label": "Chương", "fieldtype": "Link", "options": "FC Chapter", "reqd": 1},
                {"fieldname": "test_score", "label": "Điểm đạt được", "fieldtype": "Float"},
                {"fieldname": "is_passed", "label": "Đã qua", "fieldtype": "Check", "default": "0"}
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Teacher", "read": 1, "write": 1},
                {"role": "FC Student", "read": 1}
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created FC Chapter Progress")

    frappe.db.commit()
    print("Done!")

create_doctypes()
