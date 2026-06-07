import sys
sys.path.insert(0, '/home/user/Flying_Class/backend/v16-bench/env/lib/python3.14/site-packages')

import warnings
warnings.filterwarnings('ignore')

API_KEY = "YOUR_API_KEY_HERE"

import google.generativeai as genai
genai.configure(api_key=API_KEY)

models_to_test = [
    "models/gemini-2.5-flash",
    "models/gemini-2.5-pro",
    "models/gemini-pro-latest",
    "models/gemini-flash-latest",
    "models/gemini-2.0-flash-lite",
    "models/gemini-3.5-flash",
]

for model_name in models_to_test:
    print(f"\n=== Testing {model_name} ===")
    try:
        model = genai.GenerativeModel(model_name=model_name)
        response = model.generate_content('Nói một câu ngắn bằng tiếng Việt.')
        print(f"✅ SUCCESS: {response.text[:100]}")
        print(f"   >> Working model: {model_name}")
        break  # Stop at first working model
    except Exception as e:
        err = str(e)[:200]
        if "429" in err or "quota" in err.lower():
            print(f"❌ QUOTA EXCEEDED")
        elif "404" in err or "not found" in err.lower():
            print(f"❌ MODEL NOT FOUND")
        else:
            print(f"❌ ERROR: {err}")
