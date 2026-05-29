import frappe

def test():
    try:
        frappe.session.user = "Administrator"
        
        # Let's see what happens when we try to approve a profile!
        profiles = frappe.get_all("FC Teacher Profile")
        print("All profiles:", profiles)
        
        profiles = frappe.get_all("FC Teacher Profile", filters={"status": ["in", ["Pending", "Not Submitted"]]})
        if profiles:
            profile_id = profiles[0].name
            print(f"Testing approval for {profile_id}")
            try:
                from flying_class.flying_class.api import approve_teacher
                res = approve_teacher(profile_id, "Approved")
                print(res)
            except Exception as e:
                import traceback
                print("API ERROR:", traceback.format_exc())
        else:
            print("No pending profiles.")
            
    except Exception as e:
        import traceback
        print("OUTER ERROR:", traceback.format_exc())
