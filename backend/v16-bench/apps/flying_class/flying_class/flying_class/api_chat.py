import frappe

@frappe.whitelist()
def create_chat_session(title):
    user = frappe.session.user
    if "FC Teacher" not in frappe.get_roles(user):
        return {"success": False, "message": "Chỉ giáo viên mới được tạo phiên chat"}
        
    session = frappe.get_doc({
        "doctype": "FC Chat Session",
        "title": title,
        "teacher": user
    })
    session.insert(ignore_permissions=True)
    frappe.db.commit()
    
    return {"success": True, "data": {"name": session.name, "title": session.title}}

@frappe.whitelist()
def save_chat_message(session_name, role, content):
    user = frappe.session.user
    if "FC Teacher" not in frappe.get_roles(user):
        return {"success": False, "message": "Không có quyền"}
        
    session = frappe.get_doc("FC Chat Session", session_name)
    if session.teacher != user:
        return {"success": False, "message": "Không có quyền truy cập phiên chat này"}
        
    session.append("messages", {
        "role": role,
        "content": content
    })
    session.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {"success": True}

@frappe.whitelist()
def get_chat_sessions():
    user = frappe.session.user
    sessions = frappe.get_all("FC Chat Session", filters={"teacher": user}, fields=["name", "title", "creation"], order_by="creation desc")
    return {"success": True, "data": sessions}

@frappe.whitelist()
def get_chat_history(session_name):
    user = frappe.session.user
    session = frappe.get_doc("FC Chat Session", session_name)
    
    if session.teacher != user:
        return {"success": False, "message": "Không có quyền truy cập"}
        
    messages = []
    if session.messages:
        for msg in session.messages:
            messages.append({
                "role": msg.role,
                "content": msg.content,
                "name": msg.name
            })
        
    return {"success": True, "data": messages}
