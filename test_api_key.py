import google.generativeai as genai
try:
    genai.configure(api_key='AIzaSyD9hKMI10lQ9_Jud3Mtq3Txyzm8e5P0hHI')
    model = genai.GenerativeModel('models/gemini-2.0-flash')
    response = model.generate_content('Hello')
    print("SUCCESS:")
    print(response.text)
except Exception as e:
    print("ERROR:")
    print(str(e))
