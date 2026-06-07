import frappe

def run():
    frappe.init(site="flyingclass.localhost", sites_path="/home/user/Flying_Class/backend/v16-bench/sites")
    frappe.connect()
    print("=== USERS ===")
    users = frappe.db.sql("""
        SELECT name, email, custom_ai_expiration_date, custom_ai_trial_messages_used, custom_ai_package_type
        FROM `tabUser`
        WHERE name NOT IN ('Administrator', 'Guest')
    """, as_dict=True)
    for u in users:
        print(u)
        
    print("\n=== AI SUBSCRIPTION ORDERS ===")
    orders = frappe.db.sql("""
        SELECT name, teacher, package_type, amount, status, payment_date, creation
        FROM `tabFC AI Subscription Order`
        ORDER BY creation DESC
        LIMIT 10
    """, as_dict=True)
    for o in orders:
        print(o)

if __name__ == "__main__":
    run()
