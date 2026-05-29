import sys
import os

sys.path.insert(0, '/home/user/Flying_Class/backend/v16-bench/apps/frappe')
import frappe

frappe.init(site='flyingclass.localhost')
frappe.connect()

from flying_class.flying_class.api import get_my_classes

for u in ['admin@flyingclass.com', 'teacher@flyingclass.com', 'student@flyingclass.com']:
    frappe.set_user(u)
    print(f'\n--- Testing for {u} ---')
    try:
        print(get_my_classes())
    except Exception as e:
        print(f'ERROR: {e}')
