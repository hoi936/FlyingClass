import frappe
from flying_class.flying_class.api import get_subscription_status

def run():
    frappe.session.user = 'nhanaiainhan49@gmail.com'
    print("=== TESTING get_subscription_status FOR nhanaiainhan49@gmail.com ===")
    try:
        res = get_subscription_status()
        print("SUCCESS:", res)
    except Exception as e:
        import traceback
        print("ERROR:")
        print(traceback.format_exc())
