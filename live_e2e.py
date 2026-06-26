import asyncio
import httpx
import websockets
import json

API_URL = "https://solvai-api-jalkz34l4a-ew.a.run.app"
WS_URL = "wss://solvai-api-jalkz34l4a-ew.a.run.app"

async def main():
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            print("Registering user...")
            res = await client.post(f"{API_URL}/auth/register", json={
                "email": "test_live_deploy5@solvai.com",
                "password": "Password123!",
                "full_name": "Test Live",
                "organization_name": "Live Deploy Org"
            })
            
            if res.status_code not in (200, 201):
                if res.status_code == 400 and "already registered" in res.text:
                    res = await client.post(f"{API_URL}/auth/token", data={
                        "username": "test_live_deploy5@solvai.com",
                        "password": "Password123!"
                    })
                else:
                    print("Failed to register", res.text)
                    return
                
            data = res.json()
            token = data.get("access_token")
            
            res = await client.get(f"{API_URL}/users/me", headers={"Authorization": f"Bearer {token}"})
            me = res.json()
            org_id = me["organization_id"]
            
            print("Connecting Stripe...")
            res = await client.post(
                f"{API_URL}/data-sources/connect/stripe",
                headers={"Authorization": f"Bearer {token}"},
                json={"connection_details": {"api_key": "sk_test_12345"}}
            )
            print("Stripe connected:", res.status_code)
            
            print("Generating report...")
            res = await client.post(
                f"{API_URL}/solvency-reports/",
                headers={"Authorization": f"Bearer {token}"}
            )
            report = res.json()
            report_id = report["id"]
            print("Report ID:", report_id)
            
            print("Connecting to Terminal WebSocket...")
            ws_endpoint = f"{WS_URL}/ws/terminal/{org_id}?report_id={report_id}"
            
            try:
                async with websockets.connect(ws_endpoint) as websocket:
                    print("Connected to WS!")
                    while True:
                        msg = await websocket.recv()
                        event = json.loads(msg)
                        print(f"EVENT: {event.get('agent')} -> {event.get('status')} | {event.get('message')}")
                        if event.get("status") in ["completed", "error"]:
                            break
            except Exception as e:
                print("WS Error:", e)
                        
            print("Downloading PDF...")
            for _ in range(5):
                res = await client.get(
                    f"{API_URL}/solvency-reports/{report_id}/pdf",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if res.status_code == 200:
                    with open("live_report.pdf", "wb") as f:
                        f.write(res.content)
                    print("Saved live_report.pdf")
                    break
                else:
                    print("Failed to download PDF (maybe not ready?):", res.status_code, res.text)
                    await asyncio.sleep(5)
    except Exception as e:
        print("Exception:", e)

asyncio.run(main())
