from datetime import datetime, timedelta, timezone

import httpx
import pytest

from app.services import paypal_service as paypal_module
from app.services.paypal_service import PayPalAPIError, paypal_service

NOW = datetime.now(timezone.utc)


def _tx(tid, code, amount, days_ago, payer="P1", ref=None):
    info = {
        "transaction_id": tid,
        "transaction_event_code": code,
        "transaction_amount": {"value": f"{amount:.2f}", "currency_code": "EUR"},
        "transaction_initiation_date": (NOW - timedelta(days=days_ago)).strftime("%Y-%m-%dT%H:%M:%S+0000"),
    }
    if ref:
        info["paypal_reference_id"] = ref
    return {"transaction_info": info, "payer_info": {"account_id": payer}}


def _parse(value):
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


@pytest.fixture
def fake_paypal(monkeypatch):
    """Serve `state.transactions` from a fake Transaction Search API, 4 rows per page."""
    state = type("State", (), {"transactions": [], "calls": []})()

    def handler(request):
        if request.url.path == "/v1/oauth2/token":
            if request.headers["authorization"] == httpx.BasicAuth("bad", "bad")._auth_header:
                return httpx.Response(401, json={"error": "invalid_client"})
            return httpx.Response(200, json={"access_token": "tok"})

        params = request.url.params
        start, end, page = _parse(params["start_date"]), _parse(params["end_date"]), int(params["page"])
        state.calls.append((start, end, page))
        rows = [
            t for t in state.transactions
            if start <= datetime.strptime(t["transaction_info"]["transaction_initiation_date"], "%Y-%m-%dT%H:%M:%S%z") <= end
        ]
        total_pages = max(1, -(-len(rows) // 4))
        return httpx.Response(200, json={
            "transaction_details": rows[(page - 1) * 4: page * 4],
            "total_pages": total_pages,
        })

    real_client = httpx.Client
    monkeypatch.setattr(
        paypal_module.httpx, "Client",
        lambda **kw: real_client(transport=httpx.MockTransport(handler), **kw),
    )
    return state


def test_walks_contiguous_windows_of_at_most_31_days(fake_paypal):
    paypal_service.fetch_metrics("id", "secret", months=12)

    windows = sorted({(s, e) for s, e, _ in fake_paypal.calls})
    assert all(e - s <= timedelta(days=31) for s, e in windows)
    assert all(b[0] - a[1] == timedelta(seconds=1) for a, b in zip(windows, windows[1:]))
    assert windows[-1][1] >= NOW - timedelta(minutes=1)


def test_follows_every_page(fake_paypal):
    fake_paypal.transactions = [_tx(f"PAY{i}", "T0006", 100.0, 2) for i in range(10)]

    metrics = paypal_service.fetch_metrics("id", "secret")

    assert metrics["data_points"] == 10
    pages_in_busy_window = [p for *_, p in fake_paypal.calls if p > 1]
    assert pages_in_busy_window == [2, 3]


def test_counts_payments_net_of_refunds_and_ignores_non_revenue(fake_paypal):
    fake_paypal.transactions = [
        _tx("PAY1", "T0006", 500.0, 10, payer="A"),
        _tx("PAY2", "T0000", 300.0, 9, payer="B"),
        _tx("PAY3", "T0006", 200.0, 8, payer="C"),
        _tx("REF1", "T1107", -100.0, 7, ref="PAY1"),   # partial refund
        _tx("REF2", "T1107", -200.0, 6, ref="PAY3"),   # full refund
        _tx("DEP1", "T0300", 5000.0, 5),                # bank deposit
        _tx("BAL1", "T1900", 5000.0, 4),                # sandbox opening balance
    ]

    metrics = paypal_service.fetch_metrics("id", "secret")

    assert metrics["data_points"] == 2
    assert sum(m["total"] for m in metrics["monthly_revenue"]) == pytest.approx(700.0)
    # A: 400 (500 - 100 refund), B: 300 -> shares 57.1 / 42.9 -> HHI 5102
    assert metrics["client_concentration"] == {
        "top_client_percent": pytest.approx(57.1),
        "top_3_clients_percent": 100.0,
        "distinct_clients": 2,
        "hhi": 5102,
    }
    assert sorted(metrics["client_revenue"]) == [300.0, 400.0]
    # The ledger keeps IDs for evidence, but never the payer's raw account ID
    ledger = {tx["id"]: tx for tx in metrics["transactions"]}
    assert set(ledger) == {"PAY1", "PAY2"}
    assert ledger["PAY1"]["amount"] == 400.0
    assert ledger["PAY1"]["client"] != "A" and len(ledger["PAY1"]["client"]) == 12
    assert metrics["currency"] == "EUR"


def test_fills_empty_months_with_zero(fake_paypal):
    fake_paypal.transactions = [
        _tx("PAY1", "T0006", 100.0, 95),
        _tx("PAY2", "T0006", 100.0, 1),
    ]

    metrics = paypal_service.fetch_metrics("id", "secret")

    months = [m["month"] for m in metrics["monthly_revenue"]]
    assert len(months) == len(set(months)) == metrics["span_months"] >= 3
    assert any(m["total"] == 0 for m in metrics["monthly_revenue"])


def test_invalid_credentials_raise_a_clear_error(fake_paypal):
    with pytest.raises(PayPalAPIError, match="Invalid PayPal Client ID or Secret"):
        paypal_service.fetch_metrics("bad", "bad")


def _card_tx(tid, amount, account_id, name, status="N"):
    tx = _tx(tid, "T0005", amount, 3)
    tx["payer_info"] = {
        "account_id": account_id,
        "payer_status": status,
        "payer_name": {"alternate_full_name": name},
    }
    return tx


def test_guest_card_payments_from_one_client_count_once(fake_paypal):
    # PayPal assigns a fresh account_id to every guest card payment
    fake_paypal.transactions = [
        _card_tx("C1", 600.0, "SMRH3XP5XEY52", "Brightpath Ltd"),
        _card_tx("C2", 200.0, "R8AWRNUD7K2ZA", "Brightpath Ltd"),
        _card_tx("C3", 200.0, "XS2RCMZMKNMP4", "Atlas Retail SA"),
    ]

    metrics = paypal_service.fetch_metrics("id", "secret")

    assert metrics["client_concentration"]["distinct_clients"] == 2
    assert metrics["client_concentration"]["top_client_percent"] == 80.0
    clients = {tx["id"]: tx["client"] for tx in metrics["transactions"]}
    assert clients["C1"] == clients["C2"] != clients["C3"]


def test_verified_accounts_keep_their_account_id(fake_paypal):
    # Two different verified PayPal users who happen to share a name
    fake_paypal.transactions = [
        _card_tx("P1", 100.0, "ACCOUNT_A", "Alex Garcia", status="Y"),
        _card_tx("P2", 100.0, "ACCOUNT_B", "Alex Garcia", status="Y"),
    ]

    metrics = paypal_service.fetch_metrics("id", "secret")

    assert metrics["client_concentration"]["distinct_clients"] == 2


def test_payment_integrity_counts_refunds_and_chargebacks(fake_paypal):
    fake_paypal.transactions = [
        _tx("PAY1", "T0006", 500.0, 10, payer="A"),
        _tx("PAY2", "T0006", 500.0, 9, payer="B"),
        _tx("REF1", "T1107", -50.0, 7, ref="PAY1"),
        _tx("CB1", "T1201", -500.0, 5),          # chargeback
    ]

    pi = paypal_service.fetch_metrics("id", "secret")["payment_integrity"]

    assert pi == {"gross": 1000.0, "refunded": 50.0, "payments": 2, "refunded_payments": 1, "disputes": 1}
