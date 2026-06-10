import frappe

def test():
    frappe.init(site="flyingclass.localhost")
    frappe.connect()
    
    try:
        user = "Administrator"
        history_raw = frappe.db.sql("""
            SELECT CAST(creation AS DATE) as date, SUM(input_tokens + output_tokens) as total
            FROM `tabFC AI Token Usage`
            WHERE user = %s
            GROUP BY CAST(creation AS DATE)
            ORDER BY CAST(creation AS DATE) ASC
        """, (user,), as_dict=True)
        print("Success:", history_raw)
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    test()
