import frappe
frappe.init(site="flyingclass.localhost")
frappe.connect()

logs = frappe.db.sql("""
    SELECT creation, method, error 
    FROM `tabError Log` 
    ORDER BY creation DESC 
    LIMIT 20
""", as_dict=True)

if logs:
    for log in logs:
        print("="*40)
        print(f"[{log.creation}] Method: {log.method}")
        # print only the last 3 lines of the traceback
        lines = log.error.split('\n')
        print('\n'.join(lines[-5:]))
else:
    print("NO ERRORS FOUND")

