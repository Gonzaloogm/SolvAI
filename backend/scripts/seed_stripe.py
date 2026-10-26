"""Seed a Stripe TEST account with a realistic 12-month freelancer history for the demo.

Stripe cannot create charges in the past, so each charge stores its intended
date in metadata["historical_created"]. stripe_service honours that field for
test-mode keys only. Charges are never dated in the future.

Safety:
- Uses STRIPE_DEMO_TEST_KEY (see docs/demo.md) and refuses anything but sk_test_.
- Refuses to seed an account that already has charges: layering seed runs is
  what ruined the previous demo account. Use --top-up to extend an account
  seeded by this script up to today (e.g. during November).

Usage (from backend/):
    set -a; . ../.env.demo; set +a
    python scripts/seed_stripe.py --dry-run     # print the plan, create nothing
    python scripts/seed_stripe.py               # seed an empty account: last 12 months up to today
    python scripts/seed_stripe.py --top-up      # add the days since the last seeded charge
"""
import argparse
import os
import random
import sys
from datetime import datetime, timedelta, timezone

import stripe
from dateutil.relativedelta import relativedelta

SEED_TAG = "solvai-demo-v2"
CURRENCY = "eur"

# Ten clients of a freelance developer; weights put the top client near 26%
CLIENTS = [
    ("Nordwind Studio GmbH", "billing@nordwind-studio.example", 0.26),
    ("Lumen Analytics SL", "ap@lumen-analytics.example", 0.15),
    ("Atlas Retail SA", "pagos@atlas-retail.example", 0.12),
    ("Brightpath Ltd", "finance@brightpath.example", 0.10),
    ("Orbita Labs", "invoices@orbitalabs.example", 0.09),
    ("Café Marlo", "hola@cafemarlo.example", 0.08),
    ("Verde Logistics", "accounts@verdelogistics.example", 0.07),
    ("Kite & Co", "hello@kiteandco.example", 0.06),
    ("Helio Partners", "finance@heliopartners.example", 0.04),
    ("Pixel Forge", "billing@pixelforge.example", 0.03),
]
SERVICES = ["Monthly retainer", "Web development sprint", "UX audit", "API integration",
            "Landing page redesign", "Performance optimisation", "Maintenance & support"]

BASE_MONTHLY = 6800.0           # first month's target revenue
GROWTH_PER_MONTH = 0.012        # +1.2% per month
SEASONALITY = {8: 0.72, 12: 1.10, 1: 0.92}   # quieter August, busier December
NOISE = 0.07


def month_plan(month_start: datetime, index: int, rng: random.Random) -> float:
    target = BASE_MONTHLY * (1 + GROWTH_PER_MONTH) ** index
    target *= SEASONALITY.get(month_start.month, 1.0)
    return target * rng.uniform(1 - NOISE, 1 + NOISE)


RETAINER_CLIENTS = 4            # the top clients invoice every month
OCCASIONAL_BILLING_PROB = 0.75  # the rest invoice most months and catch up later


def plan_charges(start: datetime, end: datetime, rng: random.Random, first_index: int = 0) -> list[dict]:
    """Charges between start and end (both UTC), never after end.

    Each month's target is split across clients by weight; occasional clients
    carry unbilled work to their next invoice, which makes revenue lumpy the
    way freelance income is.
    """
    charges = []
    backlog = {name: 0.0 for name, *_ in CLIENTS}
    month = start.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    index = first_index  # months since the history began, so growth continues on top-ups
    while month <= end:
        next_month = month + relativedelta(months=1)
        window_start, window_end = max(month, start), min(next_month - timedelta(seconds=1), end)
        if window_start <= window_end:
            # Partial months (first and current) get the share of the month they cover
            share = (window_end - window_start).total_seconds() / (next_month - month).total_seconds()
            target = month_plan(month, index, rng) * share
            for rank, (name, email, weight) in enumerate(CLIENTS):
                backlog[name] += target * weight * rng.uniform(0.85, 1.15)
                bills = rank < RETAINER_CLIENTS or rng.random() < OCCASIONAL_BILLING_PROB
                if not bills or backlog[name] < 50:
                    continue
                created = window_start + (window_end - window_start) * rng.random()
                charges.append({
                    "amount": int(backlog[name] * 100),  # cents
                    "created": created,
                    "client": name,
                    "email": email,
                    "service": "Monthly retainer" if rank < RETAINER_CLIENTS else rng.choice(SERVICES[1:]),
                })
                backlog[name] = 0.0
        month = next_month
        index += 1
    return sorted(charges, key=lambda c: c["created"])


def _meta(charge, key: str):
    # StripeObject metadata supports `in` and indexing, not dict.get()
    return charge.metadata[key] if charge.metadata and key in charge.metadata else None


def existing_charges() -> list:
    return list(stripe.Charge.list(limit=100).auto_paging_iter())


def summarise(charges: list[dict]) -> None:
    by_month, by_client = {}, {}
    for c in charges:
        key = c["created"].strftime("%Y-%m")
        by_month[key] = by_month.get(key, 0) + c["amount"] / 100
        by_client[c["client"]] = by_client.get(c["client"], 0) + c["amount"] / 100
    total = sum(by_client.values())
    for month, amount in sorted(by_month.items()):
        print(f"  {month}  {amount:>10,.2f} EUR")
    top = max(by_client, key=by_client.get)
    print(f"  {len(charges)} charges, {total:,.2f} EUR, {len(by_client)} clients, "
          f"top client {top} {by_client[top] / total:.1%}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="print the plan without creating charges")
    parser.add_argument("--top-up", action="store_true", help="extend an account seeded by this script up to today")
    parser.add_argument("--months", type=int, default=12)
    parser.add_argument("--seed", type=int, default=2026, help="random seed, for a reproducible history")
    args = parser.parse_args()

    key = os.environ.get("STRIPE_DEMO_TEST_KEY", "")
    if not key.startswith("sk_test_"):
        print("STRIPE_DEMO_TEST_KEY must be a Stripe TEST secret key (sk_test_...). Load .env.demo.", file=sys.stderr)
        return 1
    stripe.api_key = key
    account = stripe.Account.retrieve()
    now = datetime.now(timezone.utc)
    rng = random.Random(args.seed)
    existing = existing_charges()

    if args.top_up:
        seeded = [c for c in existing if _meta(c, "seed") == SEED_TAG]
        if not seeded or len(seeded) != len(existing):
            print("Top-up only extends an account seeded entirely by this script.", file=sys.stderr)
            return 1
        dates = [datetime.fromtimestamp(int(_meta(c, "historical_created")), timezone.utc) for c in seeded]
        start = max(dates) + timedelta(seconds=1)
        first = min(dates)
        first_index = (start.year - first.year) * 12 + start.month - first.month
        rng = random.Random(args.seed + int(start.timestamp()))
    else:
        if existing:
            print(f"Account {account.id} already has {len(existing)} charge(s); refusing to layer a second seed. "
                  "Use a fresh test account, or --top-up for one seeded by this script.", file=sys.stderr)
            return 1
        # Same window the app reads: from the 1st of the month, 12 months ago
        start = (now - relativedelta(months=args.months)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        first_index = 0

    charges = plan_charges(start, now, rng, first_index)
    print(f"Account {account.id} ({getattr(account.settings.dashboard, 'display_name', '')}): "
          f"{start:%Y-%m-%d} -> {now:%Y-%m-%d %H:%M} UTC")
    summarise(charges) if charges else print("  nothing to add")
    if args.dry_run or not charges:
        return 0

    for i, c in enumerate(charges, 1):
        stripe.Charge.create(
            amount=c["amount"],
            currency=CURRENCY,
            source="tok_visa",
            description=f"{c['service']} - {c['client']}",
            receipt_email=c["email"],
            metadata={"historical_created": str(int(c["created"].timestamp())), "seed": SEED_TAG, "client": c["client"]},
        )
        if i % 20 == 0:
            print(f"  created {i}/{len(charges)}")
    print(f"Done: {len(charges)} charges created.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
