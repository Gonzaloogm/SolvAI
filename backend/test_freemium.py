import asyncio
import httpx
import sys
import uuid

async def main():
    base_url = "http://localhost:8000"
    
    # 1. Register a new user
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    print(f"Registering {email}...")
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{base_url}/auth/register", json={
            "email": email,
            "password": "password",
            "organization_name": "Test Org"
        })
        if r.status_code != 201:
            print(f"Failed to register: {r.text}")
            sys.exit(1)
            
        # 2. Login
        r = await client.post(f"{base_url}/auth/login", json={
            "email": email,
            "password": "password"
        })
        if r.status_code != 200:
            print(f"Failed to login: {r.text}")
            sys.exit(1)
        
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Check subscription (should be free)
        r = await client.get(f"{base_url}/billing/subscription", headers=headers)
        print("Subscription:", r.json())
        
        # 4. Generate first report
        print("Generating 1st report...")
        r = await client.post(f"{base_url}/solvency-reports/", headers=headers)
        if r.status_code != 201:
            print(f"Failed 1st report: {r.text}")
            sys.exit(1)
        report_id = r.json()["id"]
        
        # Wait a bit for it to run and mark as completed
        # Since it's async we can't wait for completion here unless we poll
        print(f"Report ID: {report_id}. Polling until completed...")
        for _ in range(30):
            await asyncio.sleep(2)
            r = await client.get(f"{base_url}/solvency-reports/{report_id}", headers=headers)
            status = r.json()["status"]
            if status in ["COMPLETED", "FAILED"]:
                print(f"Status: {status}")
                break
        
        if status != "COMPLETED":
            print("Report did not complete successfully")
            sys.exit(1)
            
        # 5. Try generating second report (should fail)
        print("Generating 2nd report...")
        r = await client.post(f"{base_url}/solvency-reports/", headers=headers)
        if r.status_code == 403:
            print("SUCCESS! 2nd report blocked with 403:", r.json())
        else:
            print(f"FAIL: 2nd report returned {r.status_code}: {r.text}")
            
        # 6. Try PDF download (should fail)
        print("Downloading PDF...")
        r = await client.get(f"{base_url}/solvency-reports/{report_id}/pdf", headers=headers)
        if r.status_code == 403:
            print("SUCCESS! PDF download blocked with 403:", r.json())
        else:
            print(f"FAIL: PDF download returned {r.status_code}: {r.text}")

        # 7. Test checkout session
        print("Creating checkout session...")
        r = await client.post(f"{base_url}/billing/create-checkout-session", json={"plan": "pro"}, headers=headers)
        if r.status_code == 200:
            print("SUCCESS! Checkout session URL:", r.json()["url"])
        else:
            print(f"FAIL: Checkout session returned {r.status_code}: {r.text}")

asyncio.run(main())
