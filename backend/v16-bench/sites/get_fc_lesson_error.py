import frappe
frappe.init(site="flyingclass.localhost")
frappe.connect()

logs = frappe.db.sql("""
    SELECT creation, method, error 
    FROM `tabError Log` 
    WHERE creation >= '2026-06-06 15:44:00' 
    AND creation <= '2026-06-06 15:52:00'
    ORDER BY creation DESC 
""", as_dict=True)

if logs:
    for log in logs:
        print("="*40)
        print(f"[{log.creation}] Method: {log.method}")
        print(log.error[:1000])
else:
    print("NO ERRORS FOUND IN TIMEFRAME")

