import frappe

def run():
    if frappe.db.exists('Email Account', 'FlyingClass Mailer'):
        doc = frappe.get_doc('Email Account', 'FlyingClass Mailer')
    else:
        doc = frappe.new_doc('Email Account')
        doc.email_account_name = 'FlyingClass Mailer'

    doc.email_id = 'phandinhhoi2709@gmail.com'
    doc.password = 'ytqdueboiqnfybvq'
    doc.smtp_server = 'smtp.gmail.com'
    doc.smtp_port = 587
    doc.use_tls = 1
    doc.awaiting_password = 0
    doc.enable_outgoing = 1
    doc.default_outgoing = 1
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    print('Success')
