from __future__ import annotations

import httpx
import hashlib
import base64
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize"
XERO_TOKEN_URL = "https://identity.xero.com/connect/token"
XERO_API_BASE = "https://api.xero.com/api.xro/2.0"
XERO_SCOPES = (
    "offline_access "
    "accounting.transactions.read "
    "accounting.contacts.read"
)

class XeroService:
    def get_auth_url(self, redirect_uri: str, state: str = "") -> str:
        code_verifier = secrets.token_urlsafe(32)
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode('ascii')).digest()
        ).decode('ascii').rstrip('=')
        
        params = {
            "response_type": "code",
            "client_id": settings.XERO_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": XERO_SCOPES,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256"
        }
        return f"{XERO_AUTH_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str) -> dict:
        data = {
            "grant_type": "authorization_code",
            "client_id": settings.XERO_CLIENT_ID,
            "code": code,
            "redirect_uri": redirect_uri,
        }
        
        auth = (settings.XERO_CLIENT_ID, settings.XERO_CLIENT_SECRET) if getattr(settings, "XERO_CLIENT_SECRET", None) else None

        async with httpx.AsyncClient() as client:
            response = await client.post(
                XERO_TOKEN_URL,
                data=data,
                auth=auth,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()
            return response.json()

    async def get_tenant_id(self, access_token: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.xero.com/connections",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            connections = response.json()
        if not connections:
            raise RuntimeError("No Xero organisations connected.")
        return connections[0]["tenantId"]

    async def fetch_invoices(self, access_token: str, tenant_id: str, months: int = 12) -> list[dict]:
        date_from = (datetime.now() - timedelta(days=30 * months)).strftime("%Y-%m-%d")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{XERO_API_BASE}/Invoices",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Xero-Tenant-Id": tenant_id,
                    "Accept": "application/json"
                },
                params={
                    "Statuses": "PAID",
                    "where": f"Date>=DateTime({date_from.replace('-', ',')})",
                }
            )
            response.raise_for_status()
            return response.json().get("Invoices", [])

    def aggregate_monthly(self, invoices: list[dict]):
        monthly_series = {}
        total_revenue = 0.0
        currency = "EUR"
        client_totals = {}
        for inv in invoices:
            amount = float(inv.get("AmountPaid") or inv.get("Total") or 0)
            date_str = inv.get("FullyPaidOnDate") or inv.get("Date") or ""
            if date_str.startswith("/Date("):
                try:
                    epoch_ms = int(date_str[6:-2].split("+")[0].split("-")[0])
                    date_str = datetime.utcfromtimestamp(epoch_ms / 1000).strftime("%Y-%m-%d")
                except:
                    pass
            
            month = date_str[:7] if len(date_str) >= 7 else "Unknown"
            if month not in monthly_series:
                monthly_series[month] = {"month": month, "revenue": 0.0, "transactions": 0}
            monthly_series[month]["revenue"] += amount
            monthly_series[month]["transactions"] += 1
            total_revenue += amount
            currency = inv.get("CurrencyCode", currency)
            
            client_name = inv.get("Contact", {}).get("Name", "Unknown")
            client_totals[client_name] = client_totals.get(client_name, 0) + amount

        series_list = sorted(list(monthly_series.values()), key=lambda x: x["month"])
        
        client_concentration = []
        for client, amt in sorted(client_totals.items(), key=lambda x: x[1], reverse=True)[:5]:
            client_concentration.append({
                "client": client,
                "percentage": round((amt / total_revenue) * 100, 2) if total_revenue > 0 else 0
            })
            
        return series_list, currency, "Xero", total_revenue, client_concentration

xero_service = XeroService()
