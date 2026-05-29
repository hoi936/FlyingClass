import frappe

def run():
    # Check if FC Chat Message table has rows
    count = frappe.db.count("FC Chat Message")
    print(f"FC Chat Message rows: {count}")
    
    # Check if 'messages' field exists
    field_exists = frappe.db.exists("DocField", {"parent": "FC Chat Session", "fieldname": "messages"})
    print(f"messages field exists in DocField? {field_exists}")
    
    if not field_exists:
        print("Creating custom field for messages...")
        from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
        custom_fields = {
            "FC Chat Session": [
                {
                    "fieldname": "messages",
                    "label": "Messages",
                    "fieldtype": "Table",
                    "options": "FC Chat Message",
                    "insert_after": "teacher"
                }
            ]
        }
        create_custom_fields(custom_fields)
        print("Done creating custom field.")
    
    frappe.clear_cache()
    print("Cache cleared.")
