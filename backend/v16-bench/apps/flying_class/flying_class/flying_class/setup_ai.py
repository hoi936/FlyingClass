import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def run():
    frappe.flags.in_install = True

    # 1. Add custom_ai_expiration_date to User
    if not frappe.db.exists('Custom Field', 'User-custom_ai_expiration_date'):
        create_custom_field('User', dict(
            fieldname='custom_ai_expiration_date',
            label='AI Expiration Date',
            fieldtype='Date',
            insert_after='email',
            read_only=1
        ))

    # 2. Create FC AI Subscription Order DocType
    if not frappe.db.exists('DocType', 'FC AI Subscription Order'):
        doc = frappe.get_doc({
            'doctype': 'DocType',
            'name': 'FC AI Subscription Order',
            'module': 'Flying Class',
            'custom': 1,
            'autoname': 'format:SUB-AI-{YYYY}-{####}',
            'fields': [
                {'fieldname': 'teacher', 'label': 'Teacher', 'fieldtype': 'Link', 'options': 'User', 'reqd': 1},
                {'fieldname': 'package_type', 'label': 'Package Type', 'fieldtype': 'Select', 'options': 'Monthly\nYearly', 'reqd': 1},
                {'fieldname': 'amount', 'label': 'Amount', 'fieldtype': 'Currency', 'reqd': 1},
                {'fieldname': 'status', 'label': 'Status', 'fieldtype': 'Select', 'options': 'Pending\nApproved\nRejected', 'default': 'Pending'},
                {'fieldname': 'order_code', 'label': 'Order Code', 'fieldtype': 'Data', 'unique': 1},
                {'fieldname': 'payment_date', 'label': 'Payment Date', 'fieldtype': 'Datetime'}
            ],
            'permissions': [
                {'role': 'FC Admin', 'read': 1, 'write': 1, 'create': 1, 'delete': 1},
                {'role': 'FC Teacher', 'read': 1, 'create': 1}
            ]
        })
        doc.insert(ignore_permissions=True)

    # 3. Migrate all existing users to have 3 days free trial if not set
    users = frappe.get_all('User', filters={'name': ('not in', ['Administrator', 'Guest'])})
    from frappe.utils import add_days, today
    for u in users:
        user_doc = frappe.get_doc('User', u.name)
        if not user_doc.custom_ai_expiration_date:
            user_doc.db_set('custom_ai_expiration_date', add_days(today(), 3))

    frappe.db.commit()
    print('AI Subscription DocTypes created successfully.')
