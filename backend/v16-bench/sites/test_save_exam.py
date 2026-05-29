import frappe

def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    
    questions = [{'question_text': 'Căn bậc hai số học của 16 là:', 'option_a': '4', 'option_b': '-4', 'option_c': '16 và -16', 'option_d': '256', 'correct_option': 'A'}]
    
    try:
        doc = frappe.get_doc({
            "doctype": "FC Exam",
            "title": "kiểm tra 15",
            "class_ref": "CLS-2026-0009",
            "start_time": "2026-05-20 14:22",
            "end_time": "2026-05-24 03:03",
            "duration": 15,
            "status": "Scheduled",
            "questions": questions
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print("Success")
    except Exception as e:
        print("Error:", e)
        import traceback
        traceback.print_exc()
        
if __name__ == "__main__":
    run()
