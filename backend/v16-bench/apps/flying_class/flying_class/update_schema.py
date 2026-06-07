import frappe

def update_doctypes():
    print("Updating FC Lesson permissions...")
    lesson_doc = frappe.get_doc("DocType", "FC Lesson")
    
    # Check if FC Teacher exists in permissions
    teacher_exists = False
    student_exists = False
    
    for perm in lesson_doc.permissions:
        if perm.role == "FC Teacher":
            teacher_exists = True
            perm.read = 1
            perm.write = 1
            perm.create = 1
            perm.delete = 1
        elif perm.role == "FC Student":
            student_exists = True
            perm.read = 1
            perm.write = 0
            perm.create = 0
            perm.delete = 0
            
    if not teacher_exists:
        lesson_doc.append("permissions", {
            "role": "FC Teacher",
            "read": 1, "write": 1, "create": 1, "delete": 1
        })
    if not student_exists:
        lesson_doc.append("permissions", {
            "role": "FC Student",
            "read": 1, "write": 0, "create": 0, "delete": 0
        })
        
    lesson_doc.save(ignore_permissions=True)
    
    print("Updating FC Document...")
    doc_doctype = frappe.get_doc("DocType", "FC Document")
    
    # Check if lesson_ref exists
    has_lesson_ref = any(f.fieldname == 'lesson_ref' for f in doc_doctype.fields)
    if not has_lesson_ref:
        doc_doctype.append("fields", {
            "fieldname": "lesson_ref",
            "fieldtype": "Link",
            "label": "Bài Học",
            "options": "FC Lesson",
            "insert_after": "class_ref"
        })
        doc_doctype.save(ignore_permissions=True)
    
    frappe.db.commit()
    print("Successfully updated schema and permissions.")
