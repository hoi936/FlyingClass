import frappe

def check():
    settings = frappe.get_single("FC AI Settings")
    print(f"Active Model: {settings.active_model}")
    print(f"Gemini Key: {settings.gemini_api_key}")
    print(f"GPT-4o Key: {settings.gpt4o_api_key}")
