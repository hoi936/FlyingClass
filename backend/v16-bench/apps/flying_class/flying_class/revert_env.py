import glob

files = glob.glob('*.py')
for f in files:
    if f == 'revert_env.py': continue
    with open(f, 'r') as file:
        content = file.read()
    
    content = content.replace(" 969082982386-62s95rmjq5mv081j97cgs77cp16ui9p7.apps.googleusercontent.com \,
