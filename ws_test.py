import requests
import asyncio
import websockets
import json

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/terminal"

async def test_websocket_orchestrator():
    print("1. Registering user...")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": "testws5@example.com",
        "password": "Password123!",
        "full_name": "Test WS User 5",
        "organization_name": "Test WS Org 5"
    })
    if res.status_code not in (200, 201):
        print(f"Registration failed: {res.json()}")
    
    print("2. Logging in...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "testws5@example.com",
        "password": "Password123!"
    })
    token = res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    print("3. Getting user info to find org_id...")
    res = requests.get(f"{BASE_URL}/users/me", headers=headers)
    org_id = res.json().get("organization_id")
    print(f"org_id: {org_id}")
    
    print("4. Triggering report generation...")
    res = requests.post(f"{BASE_URL}/solvency-reports/", headers=headers, json={})
    report = res.json()
    print(f"Report created: {report['id']}, Status: {report['status']}")
    
    print("5. Connecting to WebSocket...")
    uri = f"{WS_URL}/{org_id}"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            while True:
                try:
                    message = await websocket.recv()
                    data = json.loads(message)
                    print(f"EVENT: {data.get('agent')} -> {data.get('status')} | {data.get('message')}")
                    if data.get("status") == "completed":
                        print(f"FINAL SCORE: {data.get('payload', {}).get('overall_score')}")
                        break
                    elif data.get("status") == "error":
                        print("Error in stream, exiting.")
                        break
                except websockets.exceptions.ConnectionClosed:
                    print("Connection closed.")
                    break
    except Exception as e:
        print(f"Failed to connect or read: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket_orchestrator())
