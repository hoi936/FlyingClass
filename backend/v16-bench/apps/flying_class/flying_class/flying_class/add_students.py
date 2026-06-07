import frappe
from frappe.utils import nowdate

def execute():
    try:
        frappe.flags.in_test = True
        
        print("=== BẮT ĐẦU TẠO DỮ LIỆU HỌC SINH MẪU ===")
        
        students_data = [
            {"email": "ngovanhuy200905@gmail.com", "name": "Ngô Văn Huy", "phone": "0901234567"},
            {"email": "tranvana@gmail.com", "name": "Trần Văn A", "phone": "0911234568"},
            {"email": "lethib@gmail.com", "name": "Lê Thị B", "phone": "0921234569"},
            {"email": "hoangvanc@gmail.com", "name": "Hoàng Văn C", "phone": "0931234570"},
            {"email": "phamvand@gmail.com", "name": "Phạm Văn D", "phone": "0941234571"},
            {"email": "nguyenthie@gmail.com", "name": "Nguyễn Thị E", "phone": "0951234572"},
            {"email": "vothif@gmail.com", "name": "Võ Thị F", "phone": "0961234573"},
            {"email": "dangvang@gmail.com", "name": "Đặng Văn G", "phone": "0971234574"},
        ]
        
        # 1. Tạo User (Account) cho học sinh
        student_users = []
        for s in students_data:
            if not frappe.db.exists("User", s["email"]):
                user_doc = frappe.get_doc({
                    "doctype": "User",
                    "email": s["email"],
                    "first_name": s["name"],
                    "send_welcome_email": 0,
                    "roles": [{"role": "FC Student"}]
                })
                user_doc.flags.ignore_permissions = True
                user_doc.insert()
                # Set password
                from frappe.utils.password import update_password
                update_password(s["email"], "123456")
                print(f"Đã tạo User: {s['email']} với mật khẩu 123456")
            else:
                print(f"User {s['email']} đã tồn tại")
            student_users.append(s["email"])

        # 3. Lấy tất cả các lớp học hiện có
        classes = frappe.get_all("FC Class", fields=["name"])
        if not classes:
            print("Chưa có lớp học nào. Vui lòng tạo lớp học trước.")
            return

        # 4. Thêm học sinh vào các lớp (khoảng 3-4 học sinh mỗi lớp)
        import random
        for cls in classes:
            class_doc = frappe.get_doc("FC Class", cls.name)
            
            # Kiểm tra xem lớp này đã có học sinh chưa
            existing_students = [s.student for s in class_doc.get("students", [])]
            
            # Chọn ngẫu nhiên 3-4 học sinh chưa có trong lớp này
            available_students = [s for s in student_users if s not in existing_students]
            if len(available_students) > 0:
                num_to_add = min(random.randint(3, 4), len(available_students))
                selected = random.sample(available_students, num_to_add)
                
                for s_email in selected:
                    class_doc.append("students", {
                        "student": s_email,
                        "join_date": nowdate()
                    })
                
                class_doc.flags.ignore_permissions = True
                class_doc.save()
                print(f"Đã thêm {len(selected)} học sinh vào lớp {class_doc.class_name if hasattr(class_doc, 'class_name') else class_doc.name}")

        frappe.db.commit()
        print("=== HOÀN TẤT ===")
    except Exception as e:
        frappe.db.rollback()
        print(f"LỖI: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    execute()
