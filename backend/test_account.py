import asyncio
import httpx
import sys
import uuid

async def main():
    base_url = "http://localhost:8000"
    
    # 1. Register a new user
    email = f"test-account-{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"
    print(f"Registering user: {email}")
    
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{base_url}/auth/register", json={
            "email": email,
            "password": password,
            "organization_name": "Test Org"
        })
        if res.status_code != 201:
            print("Registration failed:", res.text)
            sys.exit(1)
            
        data = res.json()
        token = data["access_token"]
        print("Registration successful.")
        
        # 2. Test change password API
        print("Testing POST /auth/change-password...")
        new_password = "newpassword456"
        res2 = await client.post(f"{base_url}/auth/change-password", json={
            "current_password": password,
            "new_password": new_password
        }, headers={"Authorization": f"Bearer {token}"})
        
        if res2.status_code == 200:
            print("Password change successful!")
            print(res2.json())
        else:
            print("Password change failed:", res2.status_code, res2.text)
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
