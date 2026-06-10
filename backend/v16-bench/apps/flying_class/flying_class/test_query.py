import frappe
import google.generativeai as genai

def test():
    api_key = frappe.db.get_value("FC AI Settings", "FC AI Settings", "gemini_api_key")
    genai.configure(api_key=api_key)
    
    file_content = b"%PDF-1.4\n%EOF"
    
    part = {
        "mime_type": "application/pdf",
        "data": file_content
    }
    
    try:
        print("Generating content with inline PDF...")
        model = genai.GenerativeModel('models/gemini-flash-lite-latest')
        response = model.generate_content([part, "What is this file?"])
        print("Success:", response.text)
    except Exception as e:
        print("Error:", str(e))

