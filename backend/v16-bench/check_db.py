import frappe
import json

def execute():
    try:
        logs = frappe.get_all("Notification Log", fields=["name", "subject", "for_user"])
        with open("/home/user/Flying_Class/backend/v16-bench/logs/notify_db.json", "w") as f:
            json.dump(logs, f)
    except Exception as e:
        with open("/home/user/Flying_Class/backend/v16-bench/logs/notify_db.json", "w") as f:
            f.write(str(e))
