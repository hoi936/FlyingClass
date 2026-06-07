import os
import sys
sys.path.insert(0, '/home/user/Flying_Class/backend/v16-bench/apps/frappe')

import frappe
os.chdir('/home/user/Flying_Class/backend/v16-bench/sites')
frappe.init(site='flyingclass.localhost', sites_path='/home/user/Flying_Class/backend/v16-bench/sites')
frappe.connect()

# ==================== CẤU HÌNH API KEY ====================
# Điền Gemini Pro API Key của bạn vào đây (dạng AIzaSy...)
NEW_GEMINI_KEY = "YOUR_API_KEY_HERE"
# ==========================================================

settings = frappe.get_single('FC AI Settings')
print("Before:", settings.gemini_api_key[:25] if settings.gemini_api_key else "EMPTY")

settings.gemini_api_key = NEW_GEMINI_KEY
settings.gpt4o_api_key = NEW_GEMINI_KEY  # sync both fields
settings.active_model = "gemini"
settings.save(ignore_permissions=True)
frappe.db.commit()

# Verify
settings2 = frappe.get_single('FC AI Settings')
print("After:", settings2.gemini_api_key[:25] if settings2.gemini_api_key else "EMPTY")
print("active_model:", settings2.active_model)
print("DONE! API Key updated successfully.")

frappe.destroy()
