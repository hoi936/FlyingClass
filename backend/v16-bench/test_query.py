import frappe

def test():
    frappe.init(site="flyingclass.localhost")
    frappe.connect()
    
    try:
        user = "Administrator"
        days = 7
        history_raw = frappe.db.sql("""
            SELECT DATE(creation) as date, SUM(input_tokens + output_tokens) as total
            FROM `tabFC AI Token Usage`
            WHERE user = %s AND creation >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            GROUP BY DATE(creation)
            ORDER BY DATE(creation) ASC
        """, (user, int(days)), as_dict=True)
        print("Success:", history_raw)
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    test()
