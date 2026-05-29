import frappe

def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    
    # Try EXTRACT QUARTER and EXTRACT DAY
    try:
        res = frappe.db.sql("""
            SELECT 
                EXTRACT(QUARTER FROM '2026-05-24'::date) as q,
                EXTRACT(DAY FROM '2026-05-24'::date) as d
        """, as_dict=True)
        print("Success:", res)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    run()
