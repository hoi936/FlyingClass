import frappe
frappe.init(site="flyingclass.localhost", sites_path="./sites")
frappe.connect()
history_raw = frappe.db.sql("""
    SELECT user, creation, input_tokens, output_tokens
    FROM `tabFC AI Token Usage`
    ORDER BY creation DESC
""", as_dict=True)
for row in history_raw:
    print(f"{row.user} - {row.creation}: In {row.input_tokens}, Out {row.output_tokens}")
if not history_raw:
    print("NO DATA IN TABLE")
