from __future__ import annotations

import httpx
from datetime import datetime, timedelta
from typing import Any

from loguru import logger

from app.core.config import settings


class PayPalService:
    """
    Fetches completed income transactions from the PayPal Reporting API.

    Uses the *Client Credentials* OAuth2 flow — no user login required.
    Credentials (PAYPAL_CLIENT_ID / PAYPAL_SECRET) come from Settings.
    """

    @property
    def base_url(self) -> str:
        return (
            "https://api-m.sandbox.paypal.com"
            if settings.PAYPAL_ENV == "sandbox"
            else "https://api-m.paypal.com"
        )

    async def _get_access_token(self) -> str:
        """Obtain a short-lived OAuth2 bearer token from PayPal."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_SECRET),
                data={"grant_type": "client_credentials"},
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            token: str = response.json()["access_token"]
        logger.debug("PayPal access token obtained successfully")
        return token

    async def get_transactions(
        self,
        months: int = 12,
    ) -> list[dict[str, Any]]:
        """Fetch all *completed received* PayPal payments for the last N months.

        Only transactions with a positive amount (money received) are returned.
        """
        if not settings.PAYPAL_CLIENT_ID:
            raise RuntimeError(
                "PayPal credentials not configured. "
                "Set PAYPAL_CLIENT_ID and PAYPAL_SECRET in your environment."
            )

        token = await self._get_access_token()

        date_from = (datetime.now() - timedelta(days=30 * months)).strftime(
            "%Y-%m-%dT00:00:00-0000"
        )
        date_to = datetime.now().strftime("%Y-%m-%dT23:59:59-0000")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/v1/reporting/transactions",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "start_date": date_from,
                    "end_date": date_to,
                    "transaction_status": "S",  # S = Successful
                    "fields": "all",
                    "page_size": 500,
                },
            )
            response.raise_for_status()
            data: dict[str, Any] = response.json()

        transactions: list[dict[str, Any]] = data.get("transaction_details", [])

        income: list[dict[str, Any]] = []
        for t in transactions:
            tx_info: dict[str, Any] = t.get("transaction_info", {})
            amount_str: str = (
                tx_info.get("transaction_amount", {}).get("value", "0") or "0"
            )
            try:
                amount = float(amount_str)
            except (ValueError, TypeError):
                amount = 0.0

            # Only keep positive amounts (money received, not sent)
            if amount <= 0:
                continue

            payer_name_obj: dict[str, Any] = (
                t.get("payer_info", {}).get("payer_name", {})
            )
            full_name: str = payer_name_obj.get("full_name", "")
            if not full_name:
                # Fallback: concatenate given + surname
                given = payer_name_obj.get("given_name", "")
                surname = payer_name_obj.get("surname", "")
                full_name = f"{given} {surname}".strip() or "Unknown"

            income.append(
                {
                    "date": tx_info.get("transaction_initiation_date", "")[:10],
                    "amount": amount,
                    "currency": (
                        tx_info.get("transaction_amount", {}).get(
                            "currency_code", "EUR"
                        )
                    ),
                    "description": (
                        tx_info.get("transaction_subject")
                        or tx_info.get("transaction_note", "")
                    ),
                    "category": "PayPal Income",
                    "merchant": full_name,
                }
            )

        logger.info(
            f"PayPal: fetched {len(income)} income transactions "
            f"(from {len(transactions)} total)"
        )
        return income


# Module-level singleton
paypal_service = PayPalService()
