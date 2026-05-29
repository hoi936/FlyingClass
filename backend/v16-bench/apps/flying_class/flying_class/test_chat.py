import frappe

def run():
    sessions = frappe.get_all("FC Chat Session", fields=["name", "title"])
    if not sessions:
        print("No sessions found")
        return
        
    print(f"Found {len(sessions)} sessions")
    for s in sessions:
        try:
            doc = frappe.get_doc("FC Chat Session", s.name)
            print(f"Session {s.name}: {s.title} has {len(doc.get('messages', []))} messages")
            for m in doc.get("messages", []):
                print(f"  - {m.role}: {m.content[:20]}")
        except Exception as e:
            print(f"Error loading session {s.name}: {e}")
