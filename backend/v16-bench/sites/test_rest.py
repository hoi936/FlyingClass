import frappe
frappe.init(site="flyingclass.localhost")
frappe.connect()

user = frappe.get_doc("User", "nhanaiainhan49@gmail.com")
api_key = user.api_key
api_secret = user.get_password('api_secret')

import requests
url = "http://127.0.0.1:8000/api/resource/FC Lesson"
headers = {
    "Authorization": f"token {api_key}:{api_secret}",
    "Content-Type": "application/json",
    "Host": "flyingclass.localhost"
}
data = {
    "title": "hàm số y = a x REST 2",
    "class_ref": "CLS-2026-0016",
    "chapter_ref": "CHP-2026-0002",
    "video_url": "",
    "document_url": "",
    "order_idx": 1
}

response = requests.post(url, headers=headers, json=data)
print("STATUS CODE:", response.status_code)
print("RESPONSE:", response.text)
