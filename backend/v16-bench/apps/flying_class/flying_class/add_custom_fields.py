import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def add_fields():
    frappe.init(site='flyingclass.localhost')
    frappe.connect()
    # Field: answers (Long Text)
    if not frappe.db.exists('Custom Field', 'FC Exam Result-answers'):
        create_custom_field('FC Exam Result', {
            'fieldname': 'answers',
            'label': 'Answers',
            'fieldtype': 'Long Text',
            'insert_after': 'score'
        })
        print("Created field: answers")

    # Field: start_time (Datetime)
    if not frappe.db.exists('Custom Field', 'FC Exam Result-start_time'):
        create_custom_field('FC Exam Result', {
            'fieldname': 'start_time',
            'label': 'Start Time',
            'fieldtype': 'Datetime',
            'insert_after': 'answers'
        })
        print("Created field: start_time")

add_fields()
