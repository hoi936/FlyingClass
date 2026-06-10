import frappe

def run():
    frappe.flags.in_install = True
    
    dt = frappe.get_doc("DocType", "FC Chapter Test")
    
    updated = False
    for field in dt.fields:
        if field.fieldname == "pass_score":
            field.fieldtype = "Float"
            field.label = "Điểm qua môn (thang điểm 10)"
            updated = True
            break
            
    if updated:
        dt.save(ignore_permissions=True)
        frappe.db.commit()
        print("Updated FC Chapter Test pass_score to Float")
    else:
        print("pass_score field not found")

run()
