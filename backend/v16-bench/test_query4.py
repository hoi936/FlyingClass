import frappe

def test():
    frappe.init(site="flyingclass.localhost")
    frappe.connect()
    try:
        history_raw = frappe.db.sql("""
            SELECT user, creation, input_tokens, output_tokens
            FROM `tabFC AI Token Usage`
            ORDER BY creation DESC
        """, as_dict=True)
        print("Total rows:", len(history_raw))
        for row in history_raw:
            print(f"{row.user} - {row.creation}: In {row.input_tokens}, Out {row.output_tokens}")
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    test()
