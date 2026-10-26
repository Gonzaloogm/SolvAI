"""Create the SolvAI product and the Pro / Business monthly plans in PayPal (sandbox by default).

Run once per environment with SolvAI's own merchant app credentials, then put
the printed plan IDs in .env (or Secret Manager) as PAYPAL_PRO_PLAN_ID and
PAYPAL_BUSINESS_PLAN_ID. Re-running reuses the existing product and plans.

Usage (from backend/):
    PAYPAL_BILLING_CLIENT_ID=... PAYPAL_BILLING_SECRET=... python scripts/setup_paypal_billing.py
"""
import os
import sys

import httpx

BASE_URL = ("https://api-m.paypal.com" if os.environ.get("PAYPAL_ENV") == "live"
            else "https://api-m.sandbox.paypal.com")
PRODUCT_NAME = "SolvAI"
PLANS = {
    "pro": ("SolvAI Pro", "19.00"),
    "business": ("SolvAI Business", "49.00"),
}


def main() -> int:
    client_id = os.environ.get("PAYPAL_BILLING_CLIENT_ID")
    secret = os.environ.get("PAYPAL_BILLING_SECRET")
    if not client_id or not secret:
        print("Set PAYPAL_BILLING_CLIENT_ID and PAYPAL_BILLING_SECRET (SolvAI's merchant app).", file=sys.stderr)
        return 1

    token = httpx.post(f"{BASE_URL}/v1/oauth2/token", auth=(client_id, secret),
                       data={"grant_type": "client_credentials"}, timeout=20).raise_for_status().json()["access_token"]
    api = httpx.Client(base_url=BASE_URL, timeout=20,
                       headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})

    products = api.get("/v1/catalogs/products", params={"page_size": 20}).raise_for_status().json().get("products", [])
    product = next((p for p in products if p["name"] == PRODUCT_NAME), None)
    if not product:
        product = api.post("/v1/catalogs/products", json={
            "name": PRODUCT_NAME, "type": "SERVICE", "category": "SOFTWARE",
            "description": "Explainable solvency reports for freelancers",
        }).raise_for_status().json()
    print(f"Product {product['id']} ({PRODUCT_NAME}) on {BASE_URL}")

    existing = api.get("/v1/billing/plans", params={"product_id": product["id"], "page_size": 20}).raise_for_status().json().get("plans", [])
    for key, (name, price) in PLANS.items():
        plan = next((p for p in existing if p["name"] == name and p["status"] == "ACTIVE"), None)
        if not plan:
            plan = api.post("/v1/billing/plans", json={
                "product_id": product["id"],
                "name": name,
                "status": "ACTIVE",
                "billing_cycles": [{
                    "frequency": {"interval_unit": "MONTH", "interval_count": 1},
                    "tenure_type": "REGULAR",
                    "sequence": 1,
                    "total_cycles": 0,  # until cancelled
                    "pricing_scheme": {"fixed_price": {"value": price, "currency_code": "EUR"}},
                }],
                "payment_preferences": {"auto_bill_outstanding": True, "payment_failure_threshold": 3},
            }).raise_for_status().json()
        print(f"PAYPAL_{key.upper()}_PLAN_ID={plan['id']}    # {name}, {price} EUR/month")
    return 0


if __name__ == "__main__":
    sys.exit(main())
