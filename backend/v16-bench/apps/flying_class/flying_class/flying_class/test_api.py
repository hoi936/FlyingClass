import frappe
from flying_class.flying_class.api_admin import get_ai_config

def check():
    frappe.session.user = "Administrator"
    res = get_ai_config()
    print(res)
