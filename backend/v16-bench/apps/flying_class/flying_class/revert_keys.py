import os
import glob

files = glob.glob('*.py')
for f in files:
    if f == 'revert_keys.py': continue
    with open(f, 'r') as file:
        content = file.read()
    
    content = content.replace(" os.environ.get GOOGLE_CLIENT_ID YOUR_CLIENT_ID_HERE \,
