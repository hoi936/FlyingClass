import frappe

def create_doctypes():
    # 1. FC AI Settings
    if not frappe.db.exists("DocType", "FC AI Settings"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC AI Settings",
            "module": "Flying Class",
            "custom": 1,
            "issingle": 1,
            "fields": [
                {
                    "fieldname": "active_model",
                    "fieldtype": "Select",
                    "label": "Active Model",
                    "options": "gemini\ngpt4o",
                    "default": "gemini"
                },
                {
                    "fieldname": "gemini_api_key",
                    "fieldtype": "Data",
                    "label": "Gemini API Key"
                },
                {
                    "fieldname": "gpt4o_api_key",
                    "fieldtype": "Data",
                    "label": "GPT-4o API Key"
                }
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created Doctype FC AI Settings")

    # Set default values for single
    settings = frappe.get_doc("FC AI Settings")
    settings.active_model = "gemini"
    # Copy existing from site_config if present
    gemini_key = frappe.conf.get("gemini_api_key")
    if gemini_key and not settings.gemini_api_key:
        settings.gemini_api_key = gemini_key
    settings.save(ignore_permissions=True)
    
    # 2. FC AI Token Usage
    if not frappe.db.exists("DocType", "FC AI Token Usage"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "FC AI Token Usage",
            "module": "Flying Class",
            "custom": 1,
            "fields": [
                {
                    "fieldname": "model",
                    "fieldtype": "Data",
                    "label": "Model"
                },
                {
                    "fieldname": "input_tokens",
                    "fieldtype": "Int",
                    "label": "Input Tokens",
                    "default": 0
                },
                {
                    "fieldname": "output_tokens",
                    "fieldtype": "Int",
                    "label": "Output Tokens",
                    "default": 0
                },
                {
                    "fieldname": "action",
                    "fieldtype": "Data",
                    "label": "Action"
                },
                {
                    "fieldname": "user",
                    "fieldtype": "Link",
                    "options": "User",
                    "label": "User"
                }
            ]
        })
        doc.insert(ignore_permissions=True)
        print("Created Doctype FC AI Token Usage")
    
    frappe.db.commit()
