import frappe
def run():
    frappe.init(site="flyingclass.localhost", sites_path=".")
    frappe.connect()
    c = frappe.get_doc("FC Class", "CLS-2026-0016")
    print(c.class_name, c.status)
    for s in c.students:
        print(s.student, s.status)
if __name__ == "__main__":
    run()
