from __future__ import annotations

import httpx
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlencode

from loguru import logger

from app.core.config import settings


XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize"
XERO_TOKEN_URL = "https://identity.xero.com/connect/token"
XERO_API_BASE = "https://api.xero.com/api.xro/2.0"
XERO_SCOPES = (
    "offline_access "
    "accounting.transactions.read "
    "accounting.contacts.read"
)


class XeroService:
    """
    Handles Xero OAuth2 authorization and paid invoice retrieval.

    The *redirect_uri* must exactly match one registered in your Xero app's
    OAuth2 redirect URIs.  Pass the full URI (including scheme + host) when
    calling :meth:`exchange_code`.
    """

    def get_auth_url(self, redirect_uri: str, state: str = "") -> str:
        """Build the Xero OAuth2 authorization URL.

        Args:
            redirect_uri: The full callback URL registered in Xero.
            state: Optional CSRF token / nonce to validate on return.

        Returns:
            A URL string the browser should redirect the user to.
        """
        params: dict[str, str] = {
            "response_type": "code",
            "client_id": settings.XERO_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": XERO_SCOPES,
        }
        if state:
            params["state"] = state
        return f"{XERO_AUTH_URL}?{urlencode(params)}"

    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
    ) -> dict[str, Any]:
        """Exchange an authorization code for an access + refresh token pair.

        Args:
            code: The ``code`` query parameter received in the callback.
            redirect_uri: Must match the URI used in :meth:`get_auth_url`.

        Returns:
            The full token response dict from Xero, which includes
            ``access_token``, ``refresh_token``, ``expires_in``, etc.
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                XERO_TOKEN_URL,
                auth=(settings.XERO_CLIENT_ID, settings.XERO_CLIENT_SECRET),
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            token_data: dict[str, Any] = response.json()

        logger.info("Xero OAuth2 token exchange successful")
        return token_data

    async def get_tenant_id(self, access_token: str) -> str:
        """Retrieve the first available Xero tenant (organisation) ID.

        After exchanging a code you must fetch the connected tenants to
        find the ``tenantId`` required for all API calls.
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://api.xero.com/connections",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            connections: list[dict[str, Any]] = response.json()

        if not connections:
            raise RuntimeError("No Xero organisations connected to this token.")

        tenant_id: str = connections[0]["tenantId"]
        logger.info(f"Xero tenant resolved: {tenant_id}")
        return tenant_id

    async def get_paid_invoices(
        self,
        access_token: str,
        tenant_id: str,
        months: int = 12,
    ) -> list[dict[str, Any]]:
        """Fetch PAID invoices from Xero for the last *months* months.

        Args:
            access_token: A valid Xero OAuth2 bearer token.
            tenant_id: The Xero organisation / tenant ID.
            months: How many months of history to retrieve (default 12).

        Returns:
            A list of simplified invoice dicts suitable for analysis.
        """
        date_from = (datetime.now() - timedelta(days=30 * months)).strftime(
            "%Y-%m-%d"
        )
        modified_since = f"{date_from}T00:00:00"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{XERO_API_BASE}/Invoices",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Xero-Tenant-Id": tenant_id,
                    "Accept": "application/json",
                    "If-Modified-Since": modified_since,
                },
                params={
                    "Statuses": "PAID",
                    "where": (
                        f"Date>=DateTime({date_from.replace('-', ',')})"
                    ),
                    "order": "Date DESC",
                },
            )
            response.raise_for_status()
            data: dict[str, Any] = response.json()

        invoices: list[dict[str, Any]] = data.get("Invoices", [])
        result: list[dict[str, Any]] = []

        for inv in invoices:
            amount = float(inv.get("AmountPaid") or inv.get("Total") or 0)
            date_str: str = inv.get("FullyPaidOnDate") or inv.get("Date") or ""

            # Xero encodes dates as "/Date(epoch_ms+timezone)/"
            if date_str.startswith("/Date("):
                try:
                    epoch_ms = int(date_str[6:-2].split("+")[0].split("-")[0])
                    date_str = datetime.utcfromtimestamp(epoch_ms / 1000).strftime(
                        "%Y-%m-%d"
                    )
                except (ValueError, IndexError):
                    date_str = ""

            result.append(
                {
                    "date": date_str[:10],
                    "amount": amount,
                    "currency": inv.get("CurrencyCode", "EUR"),
                    "client": inv.get("Contact", {}).get("Name", "Unknown"),
                    "invoice_id": inv.get("InvoiceID", ""),
                    "invoice_number": inv.get("InvoiceNumber", ""),
                }
            )

        logger.info(f"Xero: fetched {len(result)} paid invoices")
        return result


# Module-level singleton
xero_service = XeroService()
