import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def run():
    frappe.flags.in_install = True

    # 1. Add AI subscription/trial fields to User
    if not frappe.db.exists('Custom Field', 'User-custom_ai_expiration_date'):
        create_custom_field('User', dict(
            fieldname='custom_ai_expiration_date',
            label='AI Expiration Date',
            fieldtype='Date',
            insert_after='email',
            read_only=1
        ))
    if not frappe.db.exists('Custom Field', 'User-custom_ai_trial_messages_used'):
        create_custom_field('User', dict(
            fieldname='custom_ai_trial_messages_used',
            label='AI Trial Messages Used',
            fieldtype='Int',
            insert_after='custom_ai_expiration_date',
            default=0,
            read_only=1
        ))
    if not frappe.db.exists('Custom Field', 'User-custom_ai_package_type'):
        create_custom_field('User', dict(
            fieldname='custom_ai_package_type',
            label='AI Package Type',
            fieldtype='Select',
            options='Normal\nPro',
            default='Normal',
            insert_after='custom_ai_trial_messages_used',
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
                {'fieldname': 'package_type', 'label': 'Package Type', 'fieldtype': 'Select', 'options': 'Monthly\nYearly\nPro_Monthly\nPro_Yearly', 'reqd': 1},
                {'fieldname': 'amount', 'label': 'Amount', 'fieldtype': 'Currency', 'reqd': 1},
                {'fieldname': 'status', 'label': 'Status', 'fieldtype': 'Select', 'options': 'Pending\nPaid\nFailed\nApproved\nRejected', 'default': 'Pending'},
                {'fieldname': 'order_code', 'label': 'Order Code', 'fieldtype': 'Data', 'unique': 1},
                {'fieldname': 'payment_gateway', 'label': 'Payment Gateway', 'fieldtype': 'Data'},
                {'fieldname': 'vnp_transaction_no', 'label': 'VNPAY Transaction No', 'fieldtype': 'Data'},
                {'fieldname': 'vnp_response_code', 'label': 'VNPAY Response Code', 'fieldtype': 'Data'},
                {'fieldname': 'vnp_transaction_status', 'label': 'VNPAY Transaction Status', 'fieldtype': 'Data'},
                {'fieldname': 'paid_at', 'label': 'Paid At', 'fieldtype': 'Datetime'},
                {'fieldname': 'payment_date', 'label': 'Payment Date', 'fieldtype': 'Datetime'}
            ],
            'permissions': [
                {'role': 'FC Admin', 'read': 1, 'write': 1, 'create': 1, 'delete': 1},
                {'role': 'FC Teacher', 'read': 1, 'create': 1}
            ]
        })
        doc.insert(ignore_permissions=True)
    else:
        ensure_subscription_order_fields()

    # 3. Migrate all existing users to have 10 free AI messages if not set.
    # Existing expiration dates are left untouched.
    users = frappe.get_all('User', filters={'name': ('not in', ['Administrator', 'Guest'])})
    for u in users:
        user_doc = frappe.get_doc('User', u.name)
        if user_doc.get('custom_ai_trial_messages_used') is None:
            user_doc.db_set('custom_ai_trial_messages_used', 0)
        if user_doc.get('custom_ai_package_type') is None:
            user_doc.db_set('custom_ai_package_type', 'Normal')

    frappe.db.commit()
    print('AI Subscription DocTypes created successfully.')

def ensure_subscription_order_fields():
    doc = frappe.get_doc('DocType', 'FC AI Subscription Order')
    existing = {field.fieldname for field in doc.fields}
    fields = [
        {'fieldname': 'payment_gateway', 'label': 'Payment Gateway', 'fieldtype': 'Data'},
        {'fieldname': 'vnp_transaction_no', 'label': 'VNPAY Transaction No', 'fieldtype': 'Data'},
        {'fieldname': 'vnp_response_code', 'label': 'VNPAY Response Code', 'fieldtype': 'Data'},
        {'fieldname': 'vnp_transaction_status', 'label': 'VNPAY Transaction Status', 'fieldtype': 'Data'},
        {'fieldname': 'paid_at', 'label': 'Paid At', 'fieldtype': 'Datetime'},
    ]
    changed = False
    for field in fields:
        if field['fieldname'] not in existing:
            doc.append('fields', field)
            changed = True
            
    package_type_field = next((f for f in doc.fields if f.fieldname == 'package_type'), None)
    if package_type_field and package_type_field.options != 'Monthly\nYearly\nPro_Monthly\nPro_Yearly':
        package_type_field.options = 'Monthly\nYearly\nPro_Monthly\nPro_Yearly'
        changed = True
        
    status_field = next((f for f in doc.fields if f.fieldname == 'status'), None)
    if status_field and 'Paid' not in (status_field.options or ''):
        status_field.options = 'Pending\nPaid\nFailed\nApproved\nRejected'
        changed = True
    if changed:
        doc.save(ignore_permissions=True)
