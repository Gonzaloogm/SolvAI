"""Create real test payments into the PayPal SANDBOX business account.

PayPal sandbox cannot backdate transactions, so history is built by running this
once a day until the demo (e.g. `--count 3` daily). Payments are card payments
captured through the Orders v2 API, so no buyer has to log in and approve them.

Credentials come from the environment (see .env.demo):
    PAYPAL_SANDBOX_CLIENT_ID, PAYPAL_SANDBOX_SECRET
Optional:
    PAYPAL_SANDBOX_TEST_CARD  card number from Developer Dashboard -> Testing Tools -> Card Generator

Usage:
    set -a; . ../.env.demo; set +a
    python scripts/seed_paypal_sandbox.py --count 3
    python scripts/seed_paypal_sandbox.py --count 3 --dry-run
"""
import argparse
import os
import random
import sys
import uuid
from datetime import datetime, timezone

import httpx
from loguru import logger

# Hardcoded on purpose: this script must never touch the live API
BASE_URL = "https://api-m.sandbox.paypal.com"

# Fictional clients of the freelancer. Weights keep the top client around 28%.
CLIENTS = [
    ("Nordwind", "Studio GmbH", "billing@nordwind-studio.example", 0.28),
    ("Lumen", "Analytics SL", "ap@lumen-analytics.example", 0.20),
    ("Atlas", "Retail SA", "pagos@atlas-retail.example", 0.16),
    ("Brightpath", "Ltd", "finance@brightpath.example", 0.14),
    ("Café", "Marlo", "hola@cafemarlo.example", 0.12),
    ("Orbita", "Labs", "invoices@orbitalabs.example", 0.10),
]
SERVICES = [
    "Web development sprint",
    "UX audit",
    "Monthly retainer",
    "Landing page redesign",
    "API integration",
    "Performance optimisation",
]


def get_token(client: httpx.Client, client_id: str, secret: str) -> str:
    r = client.post(
        "/v1/oauth2/token",
        auth=(client_id, secret),
        data={"grant_type": "client_credentials"},
    )
    r.raise_for_status()
    return r.json()["access_token"]


def create_payment(client: httpx.Client, token: str, card_number: str) -> dict:
    given, surname, email, _ = random.choices(CLIENTS, weights=[c[3] for c in CLIENTS])[0]
    amount = f"{random.uniform(150, 900):.2f}"
    service = random.choice(SERVICES)
    headers = {
        "Authorization": f"Bearer {token}",
        "PayPal-Request-Id": str(uuid.uuid4()),
        "Prefer": "return=representation",
    }
    order = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "amount": {"currency_code": "EUR", "value": amount},
            "description": service,
            "invoice_id": f"SOLVAI-SEED-{uuid.uuid4().hex[:10].upper()}",
        }],
        "payer": {"email_address": email, "name": {"given_name": given, "surname": surname}},
        "payment_source": {
            "card": {
                "number": card_number,
                "expiry": f"{datetime.now().year + 3}-12",
                "name": f"{given} {surname}",
                "billing_address": {"country_code": "ES"},
            }
        },
    }
    r = client.post("/v2/checkout/orders", json=order, headers=headers)
    if r.status_code >= 400:
        raise RuntimeError(f"create order failed ({r.status_code}): {r.text[:300]}")
    data = r.json()

    if data.get("status") != "COMPLETED":
        r = client.post(
            f"/v2/checkout/orders/{data['id']}/capture",
            headers={**headers, "PayPal-Request-Id": str(uuid.uuid4())},
        )
        if r.status_code >= 400:
            raise RuntimeError(f"capture failed ({r.status_code}): {r.text[:300]}")
        data = r.json()

    capture = data["purchase_units"][0]["payments"]["captures"][0]
    return {
        "order_id": data["id"],
        "capture_id": capture["id"],
        "status": capture["status"],
        "amount": amount,
        "client": f"{given} {surname}",
        "service": service,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--count", type=int, default=3, help="payments to create in this run (default 3)")
    parser.add_argument("--dry-run", action="store_true", help="only authenticate, create nothing")
    args = parser.parse_args()

    client_id = os.environ.get("PAYPAL_SANDBOX_CLIENT_ID")
    secret = os.environ.get("PAYPAL_SANDBOX_SECRET")
    if not client_id or not secret:
        logger.error("PAYPAL_SANDBOX_CLIENT_ID / PAYPAL_SANDBOX_SECRET are not set (load .env.demo)")
        return 1
    card_number = os.environ.get("PAYPAL_SANDBOX_TEST_CARD") or "4111111111111111"

    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        token = get_token(client, client_id, secret)
        logger.info(f"Authenticated against {BASE_URL}")
        if args.dry_run:
            logger.info("Dry run: no payments created")
            return 0

        created = 0
        for _ in range(args.count):
            try:
                p = create_payment(client, token, card_number)
                created += 1
                logger.info(
                    f"{p['status']} €{p['amount']} from {p['client']} ({p['service']}) "
                    f"order={p['order_id']} capture={p['capture_id']}"
                )
            except Exception as e:
                logger.error(f"Payment failed: {e}")

    logger.info(f"{created}/{args.count} payments created at {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC")
    return 0 if created == args.count else 1


if __name__ == "__main__":
    sys.exit(main())
