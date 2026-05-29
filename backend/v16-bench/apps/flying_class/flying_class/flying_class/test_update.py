import frappe
def run():
    frappe.session.user = 'ngovanhuy200905@gmail.com'
    from flying_class.flying_class.api import update_student_profile
    res = update_student_profile(full_name='Ngo Van Huy', mobile_no='0768595335')
    print('RESULT:', res)
    errors = frappe.get_all('Error Log', fields=['error'], order_by='creation desc', limit=1)
    if errors: print('LATEST ERROR:', errors[0].error)
