import frappe
import json
import os

path = '/home/user/Flying_Class/backend/v16-bench/apps/flying_class/flying_class/flying_class/doctype/fc_class/fc_class.json'
with open(path, 'r') as f:
    data = json.load(f)

# add teacher read permission
teacher_perm = {
    "role": "FC Teacher",
    "read": 1,
    "write": 1,
    "create": 1,
    "delete": 1,
    "email": 1,
    "export": 1,
    "print": 1,
    "report": 1,
    "share": 1
}

# check if FC Teacher is already in permissions
exists = False
for p in data['permissions']:
    if p['role'] == 'FC Teacher':
        p.update(teacher_perm)
        exists = True
        break

if not exists:
    data['permissions'].append(teacher_perm)

with open(path, 'w') as f:
    json.dump(data, f, indent=1)
