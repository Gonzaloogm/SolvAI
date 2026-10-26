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
