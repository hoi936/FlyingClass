import frappe

def execute():
    frappe.session.user = "phandinhhoi2709@gmail.com" # Some student user, wait, let's use the one from the logs: student@flyingclass.com? The screenshot has ngovanhuy200905@gmail.com
    frappe.session.user = "ngovanhuy200905@gmail.com"
    try:
        frappe.get_attr("flying_class.flying_class.api.send_chat_message")("CLS-2026-0016", "test message from script")
        print("Success")
    except Exception as e:
        print(f"Error: {e}")
