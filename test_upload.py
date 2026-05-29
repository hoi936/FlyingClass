import requests

session = requests.Session()
# Login
res = session.post('http://127.0.0.1:8001/api/method/login', data={'usr': 'teacher@flyingclass.com', 'pwd': 'user'})
print("Login status:", res.status_code, res.text)

# Upload file
files = {'file': ('test.txt', 'hello world', 'text/plain')}
data = {'is_private': 0}
res2 = session.post('http://127.0.0.1:8001/api/method/upload_file', files=files, data=data)
print("Upload status:", res2.status_code, res2.text)
