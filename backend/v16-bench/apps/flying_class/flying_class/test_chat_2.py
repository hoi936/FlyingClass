import frappe
from flying_class.flying_class.api_chat import get_chat_history

def run():
    # Find a session
    sessions = frappe.get_all("FC Chat Session", fields=["name", "teacher"])
    if not sessions:
        print("No sessions")
        return
        
    s = sessions[0]
    frappe.session.user = s.teacher
    print(f"Testing session {s.name} for user {s.teacher}")
    try:
        res = get_chat_history(s.name)
        print("Result:", res)
    except Exception as e:
        print("Error:", e)
