#!/bin/bash
cd /home/user/Flying_Class/backend/v16-bench
bench --site flyingclass.localhost console --execute "
import frappe
logs = frappe.get_all('Error Log', fields=['error'], order_by='creation desc', limit=1)
if logs:
    print('ERROR LOG:')
    print(logs[0].error)
else:
    print('NO LOGS')
"
