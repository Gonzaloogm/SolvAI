import requests
import json

API = "http://localhost:8000"

def get_admin_token():
    # Login as an admin or test user? We need the user who owns the report.
    # We can just create a new report!
    # Wait, the problem is 500 on the streaming response. ANY report should trigger it if it fails on generation.
    
    # Register a new user
    import time
    email = f"test_{int(time.time())}@test.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "password123", "organization_name": "Test Org"
    })
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    return headers

def main():
    # To reproduce the bug, I need a COMPLETED report.
    # The user states that the frontend gets a 500 error on /api/reports/{id}/pdf.
    pass

if __name__ == "__main__":
    main()
