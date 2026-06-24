import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

for m in genai.list_models():
    print(f"name: {m.name}")
    print(f"description: {m.description}")
    print("-" * 20)
