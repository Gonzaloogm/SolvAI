import requests
import json
import time

def main():
    API = "http://localhost:8000"
    email = f"test_pdf_{int(time.time())}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "TestPass123!", "organization_name": "Test Org"
    })
    token = r.json()["access_token"]
    
    # Let's try to hit the endpoint for report b14039da-5f09-4a64-9046-c8eed03af4c9
    headers = {"Authorization": f"Bearer {token}"}
    r2 = requests.get(f"{API}/solvency-reports/b14039da-5f09-4a64-9046-c8eed03af4c9/pdf", headers=headers)
    print("Status code:", r2.status_code)
    print("Response text:", r2.text[:200])

if __name__ == "__main__":
    main()
