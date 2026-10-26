"""SolvAI's own PayPal Subscriptions billing (Pro / Business plans).

Uses SolvAI's merchant app (PAYPAL_BILLING_*), never a user's data-source
credentials. Flow: create a subscription -> the buyer approves it on PayPal ->
we read it back and activate the plan; webhooks keep it in sync afterwards.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx
from loguru import logger

from app.core.config import settings

PLAN_NAMES = ("pro", "business")


class PayPalBillingError(Exception):
    pass


def _base_url() -> str:
    return "https://api-m.sandbox.paypal.com" if settings.PAYPAL_ENV == "sandbox" else "https://api-m.paypal.com"


def is_configured() -> bool:
    return bool(settings.PAYPAL_BILLING_CLIENT_ID and settings.PAYPAL_BILLING_SECRET
                and settings.PAYPAL_PRO_PLAN_ID and settings.PAYPAL_BUSINESS_PLAN_ID)


def plan_ids() -> dict[str, str]:
    return {"pro": settings.PAYPAL_PRO_PLAN_ID, "business": settings.PAYPAL_BUSINESS_PLAN_ID}


def plan_for(plan_id: str) -> str | None:
    return next((name for name, pid in plan_ids().items() if pid and pid == plan_id), None)


async def _client() -> httpx.AsyncClient:
    async with httpx.AsyncClient(base_url=_base_url(), timeout=20.0) as auth:
        r = await auth.post(
            "/v1/oauth2/token",
            auth=(settings.PAYPAL_BILLING_CLIENT_ID, settings.PAYPAL_BILLING_SECRET),
            data={"grant_type": "client_credentials"},
        )
    if r.status_code >= 400:
        raise PayPalBillingError(f"PayPal billing auth failed ({r.status_code})")
    return httpx.AsyncClient(
        base_url=_base_url(),
        timeout=20.0,
        headers={"Authorization": f"Bearer {r.json()['access_token']}", "Content-Type": "application/json"},
    )


async def _call(method: str, path: str, **kwargs) -> dict[str, Any]:
    async with await _client() as client:
        r = await client.request(method, path, **kwargs)
    if r.status_code >= 400:
        logger.error(f"PayPal billing {method} {path} -> {r.status_code}: {r.text[:300]}")
        raise PayPalBillingError(f"PayPal request failed ({r.status_code})")
    return r.json() if r.content else {}


async def create_subscription(plan: str, org_id: str, email: str, return_url: str, cancel_url: str) -> dict[str, str]:
    body = {
        "plan_id": plan_ids()[plan],
        "custom_id": org_id,  # ties the subscription to the organisation that started it
        "subscriber": {"email_address": email},
        "application_context": {
            "brand_name": "SolvAI",
            "user_action": "SUBSCRIBE_NOW",
            "shipping_preference": "NO_SHIPPING",
            "return_url": return_url,
            "cancel_url": cancel_url,
        },
    }
    data = await _call("POST", "/v1/billing/subscriptions", json=body)
    approve = next((link["href"] for link in data.get("links", []) if link.get("rel") == "approve"), None)
    if not approve:
        raise PayPalBillingError("PayPal did not return an approval link")
    return {"subscription_id": data["id"], "approve_url": approve}


async def get_subscription(subscription_id: str) -> dict[str, Any]:
    return await _call("GET", f"/v1/billing/subscriptions/{subscription_id}")


async def cancel_subscription(subscription_id: str, reason: str = "Cancelled by the user from SolvAI") -> None:
    await _call("POST", f"/v1/billing/subscriptions/{subscription_id}/cancel", json={"reason": reason})


async def verify_webhook(headers: dict[str, str], event: dict[str, Any]) -> bool:
    """Ask PayPal to verify the webhook signature (requires PAYPAL_WEBHOOK_ID)."""
    if not settings.PAYPAL_WEBHOOK_ID:
        return False
    body = {
        "auth_algo": headers.get("paypal-auth-algo"),
        "cert_url": headers.get("paypal-cert-url"),
        "transmission_id": headers.get("paypal-transmission-id"),
        "transmission_sig": headers.get("paypal-transmission-sig"),
        "transmission_time": headers.get("paypal-transmission-time"),
        "webhook_id": settings.PAYPAL_WEBHOOK_ID,
        "webhook_event": event,
    }
    if not all(body.values()):
        return False
    result = await _call("POST", "/v1/notifications/verify-webhook-signature", json=body)
    return result.get("verification_status") == "SUCCESS"


def apply_subscription(org, subscription: dict[str, Any]) -> str | None:
    """Set the organisation's plan from a PayPal subscription; returns the plan applied.

    Only ACTIVE subscriptions grant a paid plan. Ending states downgrade to free,
    but only when they concern the subscription the organisation is billed by.
    """
    status = subscription.get("status")
    plan = plan_for(subscription.get("plan_id", ""))
    if status == "ACTIVE" and plan:
        org.plan = plan
        org.status = "active"
        org.billing_provider = "paypal"
        org.paypal_subscription_id = subscription["id"]
        next_billing = (subscription.get("billing_info") or {}).get("next_billing_time")
        if next_billing:
            org.current_period_end = datetime.fromisoformat(next_billing.replace("Z", "+00:00")).replace(tzinfo=None)
        return plan
    if status in ("CANCELLED", "EXPIRED", "SUSPENDED") and org.paypal_subscription_id == subscription.get("id"):
        org.plan = "free"
        org.status = "active"
        org.paypal_subscription_id = None
        org.billing_provider = None
        org.current_period_end = None
        return "free"
    return None
