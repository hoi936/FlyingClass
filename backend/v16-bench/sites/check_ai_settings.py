import frappe
import os
os.chdir('/home/user/Flying_Class/backend/v16-bench/sites')
frappe.init(site='flyingclass.localhost', sites_path='/home/user/Flying_Class/backend/v16-bench/sites')
frappe.connect()
settings = frappe.get_single('FC AI Settings')
print('active_model:', settings.active_model)
print('gemini_api_key:', settings.gemini_api_key[:25] + '...' if settings.gemini_api_key else 'EMPTY')
print('gpt4o_api_key:', settings.gpt4o_api_key[:25] + '...' if settings.gpt4o_api_key else 'EMPTY')
frappe.destroy()
