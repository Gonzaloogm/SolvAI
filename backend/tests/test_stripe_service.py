from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.services import stripe_service

NOW = datetime.now(timezone.utc)
BACKDATED = int((NOW - timedelta(days=200)).timestamp())


@pytest.fixture
def one_backdated_charge(monkeypatch):
    charge = SimpleNamespace(
        id="ch_1", amount=10_000, amount_refunded=0, currency="eur", created=int(NOW.timestamp()),
        status="succeeded", paid=True, description="", customer=None, receipt_email="a@example.com",
        metadata={"historical_created": str(BACKDATED)},
    )
    monkeypatch.setattr(stripe_service.stripe.Charge, "list",
                        lambda **_: SimpleNamespace(data=[charge], has_more=False))


def test_test_mode_uses_seeded_dates(one_backdated_charge):
    [tx] = stripe_service.get_raw_transactions(months=12, api_key="sk_test_x")

    assert tx["created"] == BACKDATED


def test_live_mode_ignores_metadata_dates(one_backdated_charge):
    # Otherwise any live account could invent a history through charge metadata
    [tx] = stripe_service.get_raw_transactions(months=12, api_key="sk_live_x")

    assert tx["created"] != BACKDATED


def test_payment_integrity_from_charges(monkeypatch):
    def charge(cid, amount, refunded=0, disputed=False):
        return SimpleNamespace(id=cid, amount=amount, amount_refunded=refunded, currency="eur", created=int(NOW.timestamp()),
                               status="succeeded", paid=True, description="", customer=None,
                               receipt_email=f"{cid}@example.com", disputed=disputed, metadata={})
    charges = [charge("ch_1", 10_000), charge("ch_2", 10_000, refunded=2_500), charge("ch_3", 5_000, disputed=True)]
    monkeypatch.setattr(stripe_service.stripe.Charge, "list", lambda **_: SimpleNamespace(data=charges, has_more=False))

    pi = stripe_service.fetch_stripe_metrics(api_key="sk_test_x")["payment_integrity"]

    assert pi == {"gross": 250.0, "refunded": 25.0, "payments": 3, "refunded_payments": 1, "disputes": 1}
