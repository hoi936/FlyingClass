import frappe

def test():
    frappe.init(site="flyingclass.localhost")
    frappe.connect()
    try:
        user = "Administrator"
        history_raw = frappe.db.sql("""
            SELECT name, creation, CAST(creation AS DATE) as date, input_tokens, output_tokens
            FROM `tabFC AI Token Usage`
            WHERE user = %s
            ORDER BY creation DESC
        """, (user,), as_dict=True)
        print("Total rows:", len(history_raw))
        for row in history_raw:
            print(f"Row: {row}")
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    test()
