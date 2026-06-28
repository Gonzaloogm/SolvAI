from __future__ import annotations

import httpx
from datetime import datetime, timedelta
from typing import Any

from loguru import logger

from app.core.config import settings


BELVO_INSTITUTIONS: dict[str, list[dict[str, str]]] = {
    "Spain": [
        {"id": "SANTANDER_RETAIL_ES", "name": "Santander"},
        {"id": "BBVA_RETAIL_ES", "name": "BBVA"},
        {"id": "CAIXABANK_RETAIL_ES", "name": "CaixaBank"},
        {"id": "BANKINTER_RETAIL_ES", "name": "Bankinter"},
        {"id": "SABADELL_RETAIL_ES", "name": "Sabadell"},
        {"id": "ING_RETAIL_ES", "name": "ING Spain"},
        {"id": "N26_RETAIL_ES", "name": "N26"},
        {"id": "REVOLUT_RETAIL_ES", "name": "Revolut (Spain)"},
    ],
    "France": [
        {"id": "BNP_RETAIL_FR", "name": "BNP Paribas"},
        {"id": "CREDIT_AGRICOLE_RETAIL_FR", "name": "Crédit Agricole"},
        {"id": "SOCIETE_GENERALE_RETAIL_FR", "name": "Société Générale"},
        {"id": "REVOLUT_RETAIL_FR", "name": "Revolut (France)"},
    ],
    "Germany": [
        {"id": "DEUTSCHE_BANK_RETAIL_DE", "name": "Deutsche Bank"},
        {"id": "COMMERZBANK_RETAIL_DE", "name": "Commerzbank"},
        {"id": "N26_RETAIL_DE", "name": "N26"},
        {"id": "REVOLUT_RETAIL_DE", "name": "Revolut (Germany)"},
        {"id": "DKB_RETAIL_DE", "name": "DKB"},
    ],
    "Italy": [
        {"id": "INTESA_RETAIL_IT", "name": "Intesa Sanpaolo"},
        {"id": "UNICREDIT_RETAIL_IT", "name": "UniCredit"},
        {"id": "REVOLUT_RETAIL_IT", "name": "Revolut (Italy)"},
    ],
    "Portugal": [
        {"id": "MILLENNIUM_RETAIL_PT", "name": "Millennium BCP"},
        {"id": "NOVO_BANCO_RETAIL_PT", "name": "Novo Banco"},
        {"id": "REVOLUT_RETAIL_PT", "name": "Revolut (Portugal)"},
    ],
}


class BelvoService:
    """
    Wraps the Belvo Open Banking REST API using direct httpx calls.

    Credentials (BELVO_SECRET_ID / BELVO_SECRET_PASSWORD) are read from
    Settings at construction time so that the singleton works correctly both
    in tests (with overrides) and in production.
    """

    def __init__(self) -> None:
        self.base_url = (
            "https://sandbox.belvo.com"
            if settings.BELVO_ENV == "sandbox"
            else "https://api.belvo.com"
        )
        # httpx basic-auth tuple — updated dynamically via property so that
        # tests can override settings without recreating the service.

    @property
    def _auth(self) -> tuple[str, str]:
        return (settings.BELVO_SECRET_ID, settings.BELVO_SECRET_PASSWORD)

    def get_institutions(self) -> dict[str, list[dict[str, str]]]:
        """Return all supported institutions grouped by country."""
        return BELVO_INSTITUTIONS

    async def get_transactions(
        self,
        link_id: str,
        months: int = 12,
    ) -> list[dict[str, Any]]:
        """Fetch income transactions for a linked bank account via Belvo API.

        Only positive-amount transactions are returned (income side).
        """
        if not settings.BELVO_SECRET_ID:
            raise RuntimeError(
                "Belvo credentials not configured. "
                "Set BELVO_SECRET_ID and BELVO_SECRET_PASSWORD in your environment."
            )

        date_from = (datetime.now() - timedelta(days=30 * months)).strftime("%Y-%m-%d")
        date_to = datetime.now().strftime("%Y-%m-%d")

        async with httpx.AsyncClient(auth=self._auth, timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/transactions/",
                json={
                    "link": link_id,
                    "date_from": date_from,
                    "date_to": date_to,
                    "save_data": True,
                },
            )
            response.raise_for_status()
            transactions: list[dict[str, Any]] = response.json()

        # Belvo may return a paginated object or a bare list
        if isinstance(transactions, dict) and "results" in transactions:
            transactions = transactions["results"]

        # Keep only income (positive amounts, not marked as OUTFLOW)
        income = [
            t
            for t in transactions
            if float(t.get("amount", 0)) > 0 and t.get("type") != "OUTFLOW"
        ]

        return [
            {
                "date": t.get("value_date") or t.get("accounting_date", ""),
                "amount": float(t.get("amount", 0)),
                "currency": t.get("currency", "EUR"),
                "description": t.get("description", ""),
                "category": t.get("category") or "Income",
                "merchant": (t.get("merchant") or {}).get("name", "Unknown"),
            }
            for t in income
        ]

    async def create_link(
        self,
        institution: str,
        username: str,
        password: str,
    ) -> str:
        """Create a recurrent Belvo link for the given institution.

        Returns the ``id`` of the newly created link which should be stored
        (encrypted) so future transaction fetches can reference it.
        """
        if not settings.BELVO_SECRET_ID:
            raise RuntimeError(
                "Belvo credentials not configured. "
                "Set BELVO_SECRET_ID and BELVO_SECRET_PASSWORD in your environment."
            )

        async with httpx.AsyncClient(auth=self._auth, timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/links/",
                json={
                    "institution": institution,
                    "username": username,
                    "password": password,
                    "access_mode": "recurrent",
                },
            )
            response.raise_for_status()
            data: dict[str, Any] = response.json()

        link_id: str = data["id"]
        logger.info(f"Belvo link created: {link_id} for institution {institution}")
        return link_id


# Module-level singleton — import and use directly throughout the app
belvo_service = BelvoService()
