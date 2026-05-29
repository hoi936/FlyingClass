import frappe

def run():
    if not frappe.db.exists("DocType", "FC Document"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "module": "Flying Class",
            "custom": 0,
            "name": "FC Document",
            "naming_rule": "Expression (old style)",
            "autoname": "format:DOC-{YYYY}-{####}",
            "fields": [
                {"fieldname": "document_name", "fieldtype": "Data", "label": "Tên tài liệu", "reqd": 1, "in_list_view": 1},
                {"fieldname": "class_ref", "fieldtype": "Link", "options": "FC Class", "label": "Lớp học", "reqd": 1, "in_list_view": 1},
                {"fieldname": "doc_type", "fieldtype": "Select", "options": "Folder\nLink", "label": "Loại", "reqd": 1, "default": "Link", "in_list_view": 1},
                {"fieldname": "parent_folder", "fieldtype": "Link", "options": "FC Document", "label": "Thư mục cha"},
                {"fieldname": "link_url", "fieldtype": "Data", "label": "Đường dẫn (URL)"},
                {"fieldname": "teacher", "fieldtype": "Link", "options": "User", "label": "Giáo viên", "reqd": 1}
            ],
            "permissions": [
                {"role": "FC Teacher", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "FC Student", "read": 1},
                {"role": "FC Admin", "read": 1, "write": 1, "create": 1, "delete": 1}
            ]
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("Created FC Document Doctype successfully.")
    else:
        print("FC Document Doctype already exists.")
