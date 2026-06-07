import requests
import json

headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}
data = {
    'title': 'Bài 1 Hàm số y= aX',
    'class_ref': 'CLS-2026-0016',
    'chapter_ref': 'CHP-2026-0001',
    'video_url': '',
    'document_url': '',
    'order_idx': 1
}

# We need a valid session cookie or API key.
# Better to test it locally using frappe console
