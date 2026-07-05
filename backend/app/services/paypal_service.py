from __future__ import annotations

import httpx
import base64
from datetime import datetime, timedelta
from urllib.parse import urlencode

from loguru import logger
from app.core.config import settings

class PayPalService:
    @property
    def base_url(self) -> str:
        return "https://api-m.sandbox.paypal.com" if settings.PAYPAL_ENV == "sandbox" else "https://api-m.paypal.com"

    @property
    def web_url(self) -> str:
        return "https://www.sandbox.paypal.com" if settings.PAYPAL_ENV == "sandbox" else "https://www.paypal.com"

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        params = {
            "client_id": settings.PAYPAL_CLIENT_ID,
            "response_type": "code",
            "scope": "openid profile email https://uri.paypal.com/services/invoicing https://uri.paypal.com/services/reporting/search/read",
            "redirect_uri": redirect_uri,
            "state": state
        }
        return f"{self.web_url}/signin/authorize?{urlencode(params)}"

    async def get_access_token(self, code: str, redirect_uri: str) -> dict:
        auth_str = f"{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_SECRET}"
        b64_auth = base64.b64encode(auth_str.encode()).decode()
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                headers={
                    "Authorization": f"Basic {b64_auth}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri
                }
            )
            response.raise_for_status()
            return response.json()

    async def get_client_token(self) -> str:
        auth_str = f"{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_SECRET}"
        b64_auth = base64.b64encode(auth_str.encode()).decode()
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self.base_url}/v1/oauth2/token",
                headers={
                    "Authorization": f"Basic {b64_auth}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "grant_type": "client_credentials"
                }
            )
            response.raise_for_status()
            return response.json()["access_token"]

    async def fetch_transactions(self, access_token: str, months: int = 12) -> list:
        date_from = (datetime.now() - timedelta(days=30 * months)).strftime("%Y-%m-%dT00:00:00-0000")
        date_to = datetime.now().strftime("%Y-%m-%dT23:59:59-0000")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/v1/reporting/transactions",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "start_date": date_from,
                    "end_date": date_to,
                    "transaction_status": "S",
                    "fields": "all",
                    "page_size": 500
                }
            )
            response.raise_for_status()
            data = response.json()
        return data.get("transaction_details", [])

    def aggregate_monthly(self, transactions: list) -> dict:
        monthly_series = {}
        total_revenue = 0.0
        clients = {}
        currency = "EUR"

        for t in transactions:
            tx_info = t.get("transaction_info", {})
            amt_str = tx_info.get("transaction_amount", {}).get("value", "0")
            try:
                amt = float(amt_str)
            except (ValueError, TypeError):
                amt = 0.0

            if amt <= 0:
                continue
            
            currency = tx_info.get("transaction_amount", {}).get("currency_code", "EUR")
            date_str = tx_info.get("transaction_initiation_date", "")
            month = date_str[:7] if len(date_str) >= 7 else "Unknown"

            if month not in monthly_series:
                monthly_series[month] = {"month": month, "revenue": 0.0, "transactions": 0}
            monthly_series[month]["revenue"] += amt
            monthly_series[month]["transactions"] += 1

            total_revenue += amt

            payer_info = t.get("payer_info", {}).get("payer_name", {})
            full_name = payer_info.get("full_name")
            if not full_name:
                given = payer_info.get("given_name", "")
                surname = payer_info.get("surname", "")
                full_name = f"{given} {surname}".strip() or "Unknown"
                
            clients[full_name] = clients.get(full_name, 0) + amt

        series_list = sorted(list(monthly_series.values()), key=lambda x: x["month"])
        client_concentration = []
        if total_revenue > 0:
            for c_name, c_amt in sorted(clients.items(), key=lambda x: x[1], reverse=True)[:5]:
                client_concentration.append({
                    "name": c_name,
                    "percentage": round((c_amt / total_revenue) * 100, 2)
                })

        return {
            "monthly_revenue_series": series_list,
            "currency": currency,
            "platform": "PayPal",
            "total_revenue": total_revenue,
            "client_concentration": client_concentration
        }

paypal_service = PayPalService()
