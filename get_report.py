import requests
import json
import time
import os

API_URL = "https://solvai-api-879357866699.europe-west1.run.app"
EMAIL = f"test-json-{int(time.time())}@example.com"
STRIPE_KEY = os.popen('grep STRIPE_DEMO_TEST_KEY .env.demo | cut -d "=" -f2').read().strip()

print("Registering...")
resp = requests.post(f"{API_URL}/auth/register", json={
    "email": EMAIL,
    "password": "Password123!",
    "organization_name": "Live API Org"
})
token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("Connecting Stripe...")
requests.post(f"{API_URL}/data-sources/connect/stripe", headers=headers, json={
    "connection_details": {"api_key": STRIPE_KEY}
})

print("Generating Report...")
requests.post(f"{API_URL}/solvency-reports/", headers=headers)

print("Polling...")
for i in range(15):
    res = requests.get(f"{API_URL}/solvency-reports/", headers=headers).json()
    if res and len(res) > 0:
        report = res[0]
        if report.get("status") == "COMPLETED":
            with open("/Users/alumnoad/.gemini/antigravity/brain/f3d3a44d-c3a8-4d42-8a19-433414af8339/latest_report_live.json", "w") as f:
                json.dump(report, f, indent=2)
            print("DONE!")
            break
    time.sleep(3)
