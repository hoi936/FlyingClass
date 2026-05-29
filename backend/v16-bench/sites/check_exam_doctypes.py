import frappe
def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    print("FC Exam Question:", frappe.db.exists("DocType", "FC Exam Question"))
    print("FC Exam:", frappe.db.exists("DocType", "FC Exam"))
if __name__ == "__main__":
    run()
