import requests

session = requests.Session()
res = session.post('http://127.0.0.1:8001/api/method/login', data={'usr': 'teacher@flyingclass.com', 'pwd': 'user'})
print("Login status:", res.status_code, res.text)

res3 = session.post('http://127.0.0.1:8001/api/method/flying_class.flying_class.api_admin.upload_kyc', json={
    'id_card_url': '/files/test.txt',
    'certificate_url': '/files/test.txt'
})
print("Upload KYC status:", res3.status_code, res3.text)
