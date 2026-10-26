from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

import httpx
from dateutil.relativedelta import relativedelta
from loguru import logger

from app.core.config import settings
from app.services.quant_service import client_concentration, client_key, transaction_ledger

# Transaction Search only accepts date ranges of up to 31 days per request
WINDOW = timedelta(days=31)
PAGE_SIZE = 500


class PayPalAPIError(Exception):
    pass


def _payer_key(payer: dict) -> str:
    """Stable identity of whoever paid.

    A verified PayPal account (payer_status "Y") keeps its account_id. Guest card
    payments get a new account_id on every payment, so they are matched by e-mail
    or name instead; otherwise one client would count as several.
    """
    name = payer.get("payer_name", {})
    full_name = name.get("alternate_full_name") or " ".join(
        filter(None, [name.get("given_name"), name.get("surname")])
    )
    if payer.get("payer_status") == "Y" and payer.get("account_id"):
        return payer["account_id"]
    email = payer.get("email_address")
    return (
        (email and email.lower())
        or (full_name and full_name.strip().lower())
        or payer.get("account_id")
        or "unknown_client"
    )


class PayPalService:
    """Reads a merchant's PayPal history with their own REST app credentials.

    The user creates a REST app in the PayPal developer dashboard (sandbox or
    live) and pastes its Client ID / Secret, the same way Stripe takes an API key.
    """

    @property
    def base_url(self) -> str:
        return "https://api-m.sandbox.paypal.com" if settings.PAYPAL_ENV == "sandbox" else "https://api-m.paypal.com"

    def get_access_token(self, client_id: str, client_secret: str) -> str:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                f"{self.base_url}/v1/oauth2/token",
                auth=(client_id, client_secret),
                headers={"Accept": "application/json"},
                data={"grant_type": "client_credentials"},
            )
        if response.status_code == 401:
            raise PayPalAPIError("Invalid PayPal Client ID or Secret")
        if response.status_code >= 400:
            raise PayPalAPIError(f"PayPal auth failed ({response.status_code}): {response.text[:200]}")
        return response.json()["access_token"]

    def fetch_transactions(self, access_token: str, months: int = 12) -> list[dict]:
        """All successful transactions in the last `months`, walking 31-day windows and every page."""
        now = datetime.now(timezone.utc).replace(microsecond=0)
        window_start = now - relativedelta(months=months)
        transactions: list[dict] = []

        with httpx.Client(
            base_url=self.base_url,
            timeout=30.0,
            headers={"Authorization": f"Bearer {access_token}"},
        ) as client:
            while window_start < now:
                window_end = min(window_start + WINDOW - timedelta(seconds=1), now)
                page = 1
                while True:
                    response = client.get(
                        "/v1/reporting/transactions",
                        params={
                            "start_date": window_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "end_date": window_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
                            "transaction_status": "S",
                            "fields": "transaction_info,payer_info",
                            "page_size": PAGE_SIZE,
                            "page": page,
                        },
                    )
                    if response.status_code == 403:
                        raise PayPalAPIError(
                            "This PayPal app is not allowed to use Transaction Search. "
                            "Enable 'Transaction search' in the app's features in the PayPal developer dashboard."
                        )
                    if response.status_code >= 400:
                        raise PayPalAPIError(
                            f"PayPal Transaction Search failed ({response.status_code}): {response.text[:200]}"
                        )
                    data = response.json()
                    transactions.extend(data.get("transaction_details", []))
                    if page >= data.get("total_pages", 1):
                        break
                    page += 1
                window_start = window_end + timedelta(seconds=1)

        logger.info(f"PayPal: fetched {len(transactions)} transactions over {months} months")
        return transactions

    def build_metrics(self, transactions: list[dict]) -> dict:
        """Normalise PayPal transactions into the same metrics shape as fetch_stripe_metrics."""
        payments: dict[str, dict] = {}
        refunds: list[tuple[str, float]] = []
        currency = None

        for t in transactions:
            info = t.get("transaction_info", {})
            code = info.get("transaction_event_code", "")
            try:
                amount = float(info.get("transaction_amount", {}).get("value", "0"))
            except (TypeError, ValueError):
                continue

            # T00xx = payments received; T11xx = reversals/refunds. Everything else
            # (bank deposits, transfers, holds, fees) is not revenue.
            if code.startswith("T00") and amount > 0:
                client = _payer_key(t.get("payer_info", {}))
                currency = currency or info.get("transaction_amount", {}).get("currency_code")
                payments[info["transaction_id"]] = {
                    "id": info["transaction_id"],
                    "created": info.get("transaction_initiation_date", ""),
                    "amount": amount,
                    "client": client,
                    "description": info.get("transaction_subject") or info.get("transaction_note") or "",
                }
            elif code.startswith("T11") and amount < 0 and info.get("paypal_reference_id"):
                refunds.append((info["paypal_reference_id"], -amount))

        # Net refunds against the original payment, like Stripe's amount_refunded
        for ref_id, refunded in refunds:
            if ref_id in payments:
                payments[ref_id]["amount"] -= refunded

        monthly_data = defaultdict(lambda: {"total": 0.0, "transaction_count": 0})
        client_data = defaultdict(float)
        successful_txs = []
        ledger = []
        total_revenue = 0.0

        for p in sorted(payments.values(), key=lambda p: p["created"], reverse=True):
            if p["amount"] <= 0 or len(p["created"]) < 10:
                continue
            month_str = p["created"][:7]
            total_revenue += p["amount"]
            monthly_data[month_str]["total"] += p["amount"]
            monthly_data[month_str]["transaction_count"] += 1
            client_data[p["client"]] += p["amount"]
            ledger.append({"id": p["id"], "date": p["created"][:10], "amount": p["amount"], "client": client_key(p["client"])})
            successful_txs.append({
                "id": p["id"],
                "date": p["created"][:10],
                "amount_eur": round(p["amount"], 2),
                "description": p["description"],
            })

        monthly_revenue = []
        if monthly_data:
            current_dt = datetime.strptime(min(monthly_data), "%Y-%m")
            max_dt = datetime.strptime(max(monthly_data), "%Y-%m")
            while current_dt <= max_dt:
                month_str = current_dt.strftime("%Y-%m")
                monthly_revenue.append({
                    "month": month_str,
                    "total": round(monthly_data[month_str]["total"], 2),
                    "transaction_count": monthly_data[month_str]["transaction_count"],
                })
                current_dt += relativedelta(months=1)

        span_months = len(monthly_revenue)
        avg_monthly = total_revenue / span_months if span_months else 0.0

        client_revenue = [round(v, 2) for v in client_data.values()]

        return {
            "avg_monthly": avg_monthly,
            "data_points": len(successful_txs),
            "status": "CONNECTED",
            "currency": currency or "EUR",
            "transactions_sample": successful_txs[:15],
            "monthly_revenue": monthly_revenue,
            "client_concentration": client_concentration(client_revenue),
            "client_revenue": client_revenue,
            "transactions": transaction_ledger(ledger),
            "span_months": span_months,
        }

    def fetch_metrics(self, client_id: str, client_secret: str, months: int = 12) -> dict:
        token = self.get_access_token(client_id, client_secret)
        return self.build_metrics(self.fetch_transactions(token, months=months))


paypal_service = PayPalService()
