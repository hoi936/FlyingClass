import frappe
import google.generativeai as genai

def test():
    frappe.init(site="flyingclass.localhost")
    frappe.connect()
    
    settings = frappe.get_doc("FC AI Settings")
    api_key = settings.gemini_api_key or settings.gpt4o_api_key
    
    genai.configure(api_key=api_key)
    print("Available Models:")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)

if __name__ == "__main__":
    test()
