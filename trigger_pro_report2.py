import subprocess
import requests
import uuid
import os
import json
import time

API_URL = "http://localhost:8000"
with open('.env.demo') as f:
    for line in f:
        if line.startswith('STRIPE_DEMO_TEST_KEY='):
            STRIPE_KEY = line.split('=')[1].strip()

email = f"pro-user-{uuid.uuid4()}@example.com"
r = requests.post(f"{API_URL}/auth/register", json={
    "email": email,
    "password": "Password123!",
    "full_name": "Test Pro User",
    "organization_name": "Pro Org"
})
token = r.json()["access_token"]

# Use docker to run psql
sql = f"UPDATE organizations SET plan='pro', status='active', current_period_end='2099-12-31'::date WHERE id=(SELECT organization_id FROM users WHERE email='{email}');"
subprocess.run(['docker', 'exec', '-i', 'solvai_db', 'psql', '-U', 'solvai', '-d', 'solvai', '-c', sql])

headers = {"Authorization": f"Bearer {token}"}
r = requests.post(f"{API_URL}/data-sources/connect/stripe", headers=headers, json={"connection_details": {"api_key": STRIPE_KEY}})
if r.status_code == 404:
    r = requests.post(f"{API_URL}/data-sources/connect-stripe", headers=headers, json={"api_key": STRIPE_KEY})

r = requests.post(f"{API_URL}/solvency-reports/", headers=headers, json={"report_type": "FULL"})
print("Report triggered:", r.json())
