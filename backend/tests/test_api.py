import base64
import hashlib
import hmac
import json

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health(client):
    assert client.get("/health").status_code == 200


@pytest.mark.parametrize("method, path", [
    ("post", "/auth/admin/reset-demo-password"),
    ("post", "/admin/test-crypto"),
    ("get", "/data-sources/paypal/connect"),
    ("get", "/lender-matching/00000000-0000-0000-0000-000000000000"),
    ("post", "/lender-matching/manifesto"),
    ("post", "/verify/request"),
])
def test_removed_endpoints_stay_removed(client, method, path):
    assert getattr(client, method)(path).status_code in (404, 405)


def test_connect_paypal_requires_auth(client):
    response = client.post("/data-sources/connect/paypal", json={"client_id": "x", "client_secret": "y"})
    assert response.status_code == 401


def test_connect_demo_requires_auth(client):
    assert client.post("/data-sources/connect/demo").status_code == 401


@pytest.mark.parametrize("key, expected", [("", False), ("sk_live_x", False), ("sk_test_x", True)])
def test_demo_offered_only_with_a_test_key(client, monkeypatch, key, expected):
    from app.core.config import settings
    monkeypatch.setattr(settings, "DEMO_STRIPE_TEST_KEY", key)
    assert client.get("/data-sources/available-integrations").json()["demo"] is expected


def _xero_sign(body: bytes) -> str:
    return base64.b64encode(hmac.new(b"test-xero-key", body, hashlib.sha256).digest()).decode()


def test_xero_webhook_rejects_bad_signature(client):
    body = json.dumps({"events": []}).encode()
    response = client.post("/webhooks/xero", content=body, headers={"x-xero-signature": "forged"})
    assert response.status_code == 401


def test_xero_webhook_accepts_valid_signature(client, monkeypatch):
    queued = []
    monkeypatch.setattr(
        "app.api.webhooks.recalculate_solvency_task.delay", lambda org_id: queued.append(org_id)
    )
    body = json.dumps({"events": [
        {"eventCategory": "INVOICE", "eventType": "UPDATE", "tenantId": "tenant-1"},
    ]}).encode()

    response = client.post("/webhooks/xero", content=body, headers={"x-xero-signature": _xero_sign(body)})

    assert response.status_code == 200
    assert queued == ["tenant-1"]


@pytest.mark.parametrize("path", ["/reports/pl-statement", "/reports/pl-statement/pdf"])
def test_statement_requires_auth(client, path):
    assert client.get(path).status_code == 401
