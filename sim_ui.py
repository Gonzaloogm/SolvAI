import requests, json, uuid, time, os

API_URL = "http://localhost:8000"
STRIPE_KEY = os.popen('grep STRIPE_DEMO_TEST_KEY .env.demo | cut -d "=" -f2').read().strip()

email = f"test-{uuid.uuid4()}@example.com"
r = requests.post(f"{API_URL}/auth/register", json={
    "email": email,
    "password": "Password123!",
    "full_name": "Test User",
    "organization_name": "Test Org"
})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

r = requests.post(f"{API_URL}/data-sources/connect-stripe", headers=headers, json={"api_key": STRIPE_KEY})
r = requests.post(f"{API_URL}/reports/generate", headers=headers, json={"report_type": "full"})
report_id = r.json()["id"]

for i in range(15):
    time.sleep(2)
    r = requests.get(f"{API_URL}/reports/{report_id}", headers=headers)
    if r.json()["status"] == "COMPLETED":
        print(json.dumps(r.json(), indent=2))
        break
