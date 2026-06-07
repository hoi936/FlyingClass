import frappe
frappe.init(site="flyingclass.localhost")
frappe.connect()

frappe.set_user("Administrator")

import json
from flying_class.flying_class.api_admin import get_user_profile, update_user_ai_package, get_subscription_stats

print("--- Testing get_subscription_stats ---")
print(frappe.as_json(get_subscription_stats(), indent=2))

email = "nhanaiainhan49@gmail.com"
print(f"\n--- Testing get_user_profile for {email} ---")
profile = get_user_profile(email)
print(frappe.as_json(profile, indent=2))

print(f"\n--- Testing update_user_ai_package (setting date to 2026-07-02) ---")
res = update_user_ai_package(email, "2026-07-02")
print(res)

print("\n--- Testing get_user_profile again after update ---")
profile2 = get_user_profile(email)
print(frappe.as_json(profile2, indent=2))

print(f"\n--- Testing update_user_ai_package (clearing date) ---")
res2 = update_user_ai_package(email, None)
print(res2)

print("\n--- Testing get_user_profile again after clear ---")
profile3 = get_user_profile(email)
print(frappe.as_json(profile3, indent=2))
