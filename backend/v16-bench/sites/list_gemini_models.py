import google.generativeai as genai
import frappe

def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    
    api_key = frappe.conf.get("gemini_api_key")
    genai.configure(api_key=api_key)
    
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
            
if __name__ == "__main__":
    run()
