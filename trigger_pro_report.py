import asyncio
import asyncpg
import urllib.parse
import requests
import json
import uuid
import time
import os

API_URL = "http://localhost:8000"
STRIPE_KEY = os.popen('grep STRIPE_DEMO_TEST_KEY .env.demo | cut -d "=" -f2').read().strip()

async def main():
    email = f"pro-user-{uuid.uuid4()}@example.com"
    r = requests.post(f"{API_URL}/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Test Pro User",
        "organization_name": "Pro Org"
    })
    token = r.json()["access_token"]
    
    # Upgrade to Pro
    pwd = urllib.parse.quote_plus('8j4gZ/fG93alcj4RukELejzD8Bf6/yaw')
    conn = await asyncpg.connect(f'postgresql://solvai:{pwd}@127.0.0.1:5432/solvai')
    await conn.execute(f'''
        UPDATE organizations
        SET plan = \'pro\',
            status = \'active\',
            current_period_end = \'2099-12-31\'::date
        WHERE id = (
            SELECT organization_id FROM users
            WHERE email = \'{email}\'
        );
    ''')
    await conn.close()

    headers = {"Authorization": f"Bearer {token}"}
    r = requests.post(f"{API_URL}/data-sources/connect/stripe", headers=headers, json={"connection_details": {"api_key": STRIPE_KEY}})

    r = requests.post(f"{API_URL}/solvency-reports/", headers=headers, json={"report_type": "FULL"})
    print("Report triggered:", r.json())

asyncio.run(main())
