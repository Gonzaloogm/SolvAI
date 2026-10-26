import json
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.main import app
from app.services import paypal_billing

ORG_ID = "6f1c2c1e-9a3e-4a4b-9f0e-2b2d7c3e1a10"


@pytest.fixture
def configured(monkeypatch):
    for name, value in {
        "PAYPAL_BILLING_CLIENT_ID": "billing-id", "PAYPAL_BILLING_SECRET": "billing-secret",
        "PAYPAL_PRO_PLAN_ID": "P-PRO", "PAYPAL_BUSINESS_PLAN_ID": "P-BUSINESS", "PAYPAL_WEBHOOK_ID": "WH-1",
    }.items():
        monkeypatch.setattr(settings, name, value)


@pytest.fixture
def paypal_api(monkeypatch):
    """Fake PayPal REST API; records requests and serves `state.subscription`."""
    state = SimpleNamespace(requests=[], subscription={}, verification="SUCCESS")

    def handler(request):
        state.requests.append((request.method, request.url.path, request.content))
        path = request.url.path
        if path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok"})
        if path == "/v1/billing/subscriptions" and request.method == "POST":
            return httpx.Response(201, json={"id": "I-NEW", "status": "APPROVAL_PENDING", "links": [
                {"rel": "approve", "href": "https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-1"}]})
        if path.startswith("/v1/billing/subscriptions/") and path.endswith("/cancel"):
            return httpx.Response(204)
        if path.startswith("/v1/billing/subscriptions/"):
            return httpx.Response(200, json=state.subscription)
        if path == "/v1/notifications/verify-webhook-signature":
            return httpx.Response(200, json={"verification_status": state.verification})
        return httpx.Response(404)

    real = httpx.AsyncClient
    monkeypatch.setattr(paypal_billing.httpx, "AsyncClient",
                        lambda **kw: real(transport=httpx.MockTransport(handler), **kw))
    return state


@pytest.fixture
def org():
    return SimpleNamespace(id=ORG_ID, plan="free", status="active", billing_provider=None,
                           paypal_subscription_id=None, current_period_end=None)


@pytest.fixture
def client(org):
    class FakeSession:
        async def execute(self, *_):
            return SimpleNamespace(scalar_one_or_none=lambda: org)

        async def commit(self):
            pass

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(organization_id=ORG_ID, email="f@example.com")
    app.dependency_overrides[get_db] = lambda: FakeSession()
    yield TestClient(app)
    app.dependency_overrides.clear()


async def test_create_subscription_ties_it_to_the_org(configured, paypal_api):
    result = await paypal_billing.create_subscription("pro", ORG_ID, "f@example.com", "https://app/ok", "https://app/ko")

    assert result == {"subscription_id": "I-NEW",
                      "approve_url": "https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-1"}
    body = json.loads(next(c for m, p, c in paypal_api.requests if p == "/v1/billing/subscriptions"))
    assert body["plan_id"] == "P-PRO" and body["custom_id"] == ORG_ID


def test_only_active_subscriptions_grant_a_plan(configured, org):
    assert paypal_billing.apply_subscription(org, {"id": "I-1", "status": "APPROVED", "plan_id": "P-PRO"}) is None
    assert org.plan == "free"

    plan = paypal_billing.apply_subscription(org, {"id": "I-1", "status": "ACTIVE", "plan_id": "P-BUSINESS",
                                                   "billing_info": {"next_billing_time": "2026-11-26T10:00:00Z"}})
    assert plan == "business" and org.billing_provider == "paypal" and org.paypal_subscription_id == "I-1"
    assert org.current_period_end.isoformat() == "2026-11-26T10:00:00"


def test_cancelling_another_subscription_does_not_downgrade(configured, org):
    org.plan, org.billing_provider, org.paypal_subscription_id = "pro", "paypal", "I-CURRENT"

    assert paypal_billing.apply_subscription(org, {"id": "I-OLD", "status": "CANCELLED"}) is None
    assert org.plan == "pro"
    assert paypal_billing.apply_subscription(org, {"id": "I-CURRENT", "status": "CANCELLED"}) == "free"
    assert org.plan == "free" and org.billing_provider is None and org.current_period_end is None


def test_subscribe_requires_configuration(client, monkeypatch):
    monkeypatch.setattr(settings, "PAYPAL_BILLING_CLIENT_ID", "")
    assert client.post("/billing/paypal/subscribe", json={"plan": "pro"}).status_code == 503


def test_subscribe_returns_the_approval_link(client, configured, paypal_api):
    response = client.post("/billing/paypal/subscribe", json={"plan": "business"})

    assert response.status_code == 200
    assert response.json()["approve_url"].startswith("https://www.sandbox.paypal.com/")


def test_confirm_rejects_a_subscription_from_another_account(client, configured, paypal_api, org):
    paypal_api.subscription = {"id": "I-X", "status": "ACTIVE", "plan_id": "P-PRO", "custom_id": "someone-else"}

    response = client.post("/billing/paypal/confirm", json={"subscription_id": "I-X"})

    assert response.status_code == 403 and org.plan == "free"


def test_confirm_activates_the_plan(client, configured, paypal_api, org):
    paypal_api.subscription = {"id": "I-OK", "status": "ACTIVE", "plan_id": "P-PRO", "custom_id": ORG_ID}

    response = client.post("/billing/paypal/confirm", json={"subscription_id": "I-OK"})

    assert response.json() == {"plan": "pro", "status": "active"} and org.plan == "pro"


def test_webhook_with_bad_signature_is_rejected(client, configured, paypal_api, org):
    paypal_api.verification = "FAILURE"
    event = {"event_type": "BILLING.SUBSCRIPTION.ACTIVATED",
             "resource": {"id": "I-OK", "status": "ACTIVE", "plan_id": "P-PRO", "custom_id": ORG_ID}}
    headers = {h: "x" for h in ("paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id",
                                "paypal-transmission-sig", "paypal-transmission-time")}

    assert client.post("/webhooks/paypal-billing", json=event, headers=headers).status_code == 400
    assert org.plan == "free"

    paypal_api.verification = "SUCCESS"
    assert client.post("/webhooks/paypal-billing", json=event, headers=headers).status_code == 200
    assert org.plan == "pro"


def test_stripe_webhook_rejects_events_when_unconfigured(client, monkeypatch):
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "")
    fake = {"type": "checkout.session.completed", "data": {"object": {"metadata": {"organization_id": ORG_ID, "plan": "business"}}}}

    assert client.post("/billing/webhook", json=fake).status_code == 503
