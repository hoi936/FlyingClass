import sys
import urllib.request
import urllib.parse
import json

data = urllib.parse.urlencode({'question': 'Xin chao'}).encode()
req = urllib.request.Request(
    'http://localhost:8002/api/method/flying_class.flying_class.api.ask_flyingclass_ai',
    data=data,
    headers={'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': 'sid=Guest'}
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
        print("HTTP Status: 200")
        msg_data = result.get('message', {})
        print("Success:", msg_data.get('success'))
        print("Reply:", str(msg_data.get('reply', msg_data.get('message', '')))[:300])
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print("HTTP Error:", e.code)
    print("Body:", body[:500])
except Exception as ex:
    print("Error:", str(ex))
