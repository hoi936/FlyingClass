import frappe
import traceback

frappe.init(site="flyingclass.localhost")
frappe.connect()

frappe.set_user("nhanaiainhan49@gmail.com")

try:
    doc = frappe.get_doc({
        'doctype': 'FC Lesson',
        'title': 'Test 123',
        'class_ref': 'CLS-2026-0016',
        'chapter_ref': 'CHP-2026-0001',
        'order_idx': 1
    })
    doc.insert()
    frappe.db.commit()
    print("SUCCESS")
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
