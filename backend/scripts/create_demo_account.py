"""Create (or refresh) the account judges use to try SolvAI.

Goes through the real API, so the account is exactly what a user would get:
register -> connect the Stripe demo account and the PayPal sandbox -> generate a
first report. The plan is then set to Pro directly in the database so the full
report and the PDF are visible without a payment.

Re-running it is safe: it logs in instead of registering and reconnects the
sources (each connect replaces the previous source of the same type).

Run inside the API container on the server:
    docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod exec \
        -e DEMO_EMAIL=demo@... -e DEMO_PASSWORD=... \
        -e STRIPE_DEMO_TEST_KEY=sk_test_... -e PAYPAL_SANDBOX_CLIENT_ID=... -e PAYPAL_SANDBOX_SECRET=... \
        api python scripts/create_demo_account.py
"""
import asyncio
import os
import sys
import time

import httpx

# Make `app` importable when run from backend/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

API = os.environ.get("DEMO_API_URL", "http://localhost:8000")


def require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        sys.exit(f"Missing {name}")
    return value


async def make_pro(organization_id: str) -> None:
    from sqlalchemy import update

    from app.core.database import AsyncSessionLocal
    from app.models.organization import Organization

    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Organization)
            .where(Organization.id == organization_id)
            .values(plan="pro", status="active", billing_provider=None)
        )
        await db.commit()


def main() -> int:
    email, password = require("DEMO_EMAIL"), require("DEMO_PASSWORD")
    stripe_key = require("STRIPE_DEMO_TEST_KEY")
    if not stripe_key.startswith("sk_test_"):
        sys.exit("STRIPE_DEMO_TEST_KEY must be a test-mode key (sk_test_...)")

    api = httpx.Client(base_url=API, timeout=120)

    r = api.post("/auth/register", json={"email": email, "password": password,
                                         "full_name": "Demo Freelancer", "organization_name": "Demo Studio"})
    if r.status_code == 201:
        token = r.json()["access_token"]
        print(f"Registered {email}")
    else:
        r = api.post("/auth/login", json={"email": email, "password": password})
        r.raise_for_status()
        token = r.json()["access_token"]
        print(f"{email} already exists; refreshing it")
    api.headers["Authorization"] = f"Bearer {token}"
    me = api.get("/auth/me").raise_for_status().json()

    r = api.post("/data-sources/connect/stripe", json={"connection_details": {"api_key": stripe_key}})
    r.raise_for_status()
    print(f"Stripe connected: {r.json().get('records_count')} payments")

    if os.environ.get("PAYPAL_SANDBOX_CLIENT_ID"):
        r = api.post("/data-sources/connect/paypal", json={"connection_details": {
            "client_id": require("PAYPAL_SANDBOX_CLIENT_ID"), "client_secret": require("PAYPAL_SANDBOX_SECRET")}})
        r.raise_for_status()
        print(f"PayPal connected: {r.json().get('records_count')} payments")

    asyncio.run(make_pro(me["organization_id"]))
    print("Plan set to Pro")

    report = api.post("/solvency-reports/", json={}).raise_for_status().json()
    started = time.time()
    while time.time() - started < 300:
        status = api.get(f"/solvency-reports/{report['id']}").raise_for_status().json()
        if status["status"] in ("COMPLETED", "FAILED"):
            break
        time.sleep(5)
    data = status.get("report_data") or {}
    print(f"First report {status['status']}: score {data.get('overall_score')} {data.get('rating') or data.get('error', '')}")
    return 0 if status["status"] == "COMPLETED" else 1


if __name__ == "__main__":
    sys.exit(main())
