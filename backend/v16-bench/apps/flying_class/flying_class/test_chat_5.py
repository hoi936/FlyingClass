import frappe

def run():
    # 1. Create a session
    s = frappe.get_doc({
        "doctype": "FC Chat Session",
        "title": "Test Session",
        "teacher": "nhanaiainhan49@gmail.com" # adjust this to an existing user if needed, or don't validate in test
    })
    s.insert(ignore_permissions=True)
    frappe.db.commit()
    session_name = s.name
    print(f"Created session {session_name}")
    
    # 2. Append message
    doc = frappe.get_doc("FC Chat Session", session_name)
    doc.append("messages", {
        "role": "User",
        "content": "Hello this is a test message"
    })
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    print("Saved message to session")
    
    # 3. Reload and check
    doc2 = frappe.get_doc("FC Chat Session", session_name)
    print(f"Reloaded session has {len(doc2.get('messages', []))} messages")
    for m in doc2.get("messages", []):
        print(f"  - {m.role}: {m.content}")
        
    # Check what is inside FC Chat Message for this session
    msgs = frappe.db.get_all("FC Chat Message", filters={"parent": session_name}, fields=["name", "role", "content"])
    print(f"DB Query found {len(msgs)} messages: {msgs}")
