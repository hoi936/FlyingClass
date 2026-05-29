import frappe

def run():
    classes = frappe.get_all("FC Class", filters={"status": "Active"})
    
    if not classes:
        # Create a teacher user if none exists
        teacher_users = frappe.get_all("User", filters={"name": ("like", "%teacher%")})
        if not teacher_users:
            teacher_doc = frappe.get_doc({
                "doctype": "User",
                "email": "teacher1@example.com",
                "first_name": "Teacher",
                "send_welcome_email": 0
            }).insert(ignore_permissions=True)
            teacher_doc.add_roles("FC Teacher")
            teacher = teacher_doc.name
        else:
            teacher = teacher_users[0].name
            
        # Create a class
        class_doc = frappe.get_doc({
            "doctype": "FC Class",
            "class_name": "Toán Học Lớp 10",
            "class_code": "TOAN10",
            "teacher": teacher,
            "status": "Active"
        }).insert(ignore_permissions=True)
        class_id = class_doc.name
    else:
        class_id = classes[0].name
        class_doc = frappe.get_doc("FC Class", class_id)
        teacher = class_doc.teacher
        
    # Get students from class
    students = [s.student for s in class_doc.students]
    
    if not students:
        # Create student 1
        student1_email = "student1@example.com"
        if not frappe.db.exists("User", student1_email):
            s1 = frappe.get_doc({
                "doctype": "User",
                "email": student1_email,
                "first_name": "Student 1",
                "send_welcome_email": 0
            }).insert(ignore_permissions=True)
            s1.add_roles("FC Student")
        
        # Create student 2
        student2_email = "student2@example.com"
        if not frappe.db.exists("User", student2_email):
            s2 = frappe.get_doc({
                "doctype": "User",
                "email": student2_email,
                "first_name": "Student 2",
                "send_welcome_email": 0
            }).insert(ignore_permissions=True)
            s2.add_roles("FC Student")
            
        # Enroll them
        class_doc.append("students", {"student": student1_email})
        class_doc.append("students", {"student": student2_email})
        class_doc.save(ignore_permissions=True)
        students = [student1_email, student2_email]
    
    # Get students from class
    if not class_doc.students:
        print(f"Class {class_id} has no students. Chat data will only involve the teacher.")
        students = []
    else:
        students = [s.student for s in class_doc.students]

    # Create chat messages
    messages = [
        {"sender": teacher, "is_teacher": 1, "message": "Chào các em! Có câu hỏi nào về bài 1 không?"},
    ]
    if students:
        messages.append({"sender": students[0], "is_teacher": 0, "message": "Dạ em chưa hiểu rõ phần tính đạo hàm thầy ạ."})
        messages.append({"sender": teacher, "is_teacher": 1, "message": "Phần đó em áp dụng công thức (u/v)' nhé."})
    
    if len(students) > 1:
        messages.append({"sender": students[1], "is_teacher": 0, "message": "Em hiểu rồi ạ, cảm ơn thầy!"})
    
    for m in messages:
        doc = frappe.get_doc({
            "doctype": "FC Chat Message",
            "class_ref": class_id,
            "sender": m["sender"],
            "is_teacher": m["is_teacher"],
            "message": m["message"]
        })
        doc.insert(ignore_permissions=True)
    
    frappe.db.commit()
    print(f"Created {len(messages)} mock chat messages for class {class_id}.")
