import pypdf
reader = pypdf.PdfReader("/Users/alumnoad/.gemini/antigravity/brain/3a7b47e0-a743-485a-8446-3b494b913165/live_report.pdf")
print("Total pages:", len(reader.pages))
text = ""
for i, page in enumerate(reader.pages):
    print(f"--- PAGE {i+1} ---")
    content = page.extract_text()
    print(content)
    text += content
    
if "BANK_API" in text:
    print("WARNING: BANK_API FOUND!")
else:
    print("SUCCESS: NO BANK_API")
