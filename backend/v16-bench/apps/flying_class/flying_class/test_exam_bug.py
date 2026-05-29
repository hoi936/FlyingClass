import frappe
from flying_class.flying_class.api import save_exam_schedule

def run():
    frappe.session.user = "nhanaiainhan49@gmail.com"
    questions = [{
        "question_text": "Q1",
        "option_a": "A",
        "option_b": "B",
        "option_c": "C",
        "option_d": "D",
        "correct_option": "A",
        "options_json": '["A","B","C","D"]',
        "correct_option_index": 0
    }]
    
    try:
        # Find a class link
        classes = frappe.get_all("FC Class", limit=1)
        if not classes:
            print("No class found to test")
            return
            
        class_link = classes[0].name
        
        save_exam_schedule(
            exam_name="Test Exam Debug",
            class_link=class_link,
            start_time="2026-05-29 10:00",
            end_time="2026-05-30 10:00",
            duration_minutes=45,
            questions=questions,
            max_attempts=1
        )
        print("Success")
    except Exception as e:
        import traceback
        print("Error:")
        traceback.print_exc()
