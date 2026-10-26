import pytest

from app.services.quant_service import client_concentration, compute_revenue_metrics


def _summary(totals, concentration=None, start_year=2025, start_month=1):
    series = []
    for i, total in enumerate(totals):
        y, m = divmod(start_month - 1 + i, 12)
        series.append({"month": f"{start_year + y}-{m + 1:02d}", "total": total, "transaction_count": 1})
    return {"monthly_revenue_series": series, "client_concentration": concentration}


def test_hhi_and_top_shares_from_client_revenue():
    cc = client_concentration([500.0, 300.0, 200.0, 0.0])

    # shares 50/30/20 -> 2500 + 900 + 400
    assert cc == {"top_client_percent": 50.0, "top_3_clients_percent": 100.0, "distinct_clients": 3, "hhi": 3800}


def test_no_client_revenue_means_no_concentration():
    assert client_concentration([]) is None


def test_constant_revenue_has_zero_volatility_and_stable_trend():
    metrics = compute_revenue_metrics(_summary([1000.0] * 12))

    assert metrics["volatility"]["cov_percent"] == 0.0
    assert metrics["volatility"]["level"] == "LOW"
    assert metrics["trend"]["direction"] == "STABLE"
    assert metrics["weak_months"]["below_average"] == 0
    assert not any("month(s) of history" in n for n in metrics["data_quality_notes"])


def test_linear_growth_is_detected_with_perfect_fit():
    metrics = compute_revenue_metrics(_summary([1000.0 + 100 * i for i in range(12)]))

    trend = metrics["trend"]
    assert trend["direction"] == "GROWING"
    assert trend["slope_per_month"] == pytest.approx(100.0)
    assert trend["r_squared"] == pytest.approx(1.0)
    # mean is 1550, so +100/month is +6.45% of average
    assert trend["slope_percent_per_month"] == pytest.approx(6.45, abs=0.01)


def test_noisy_series_without_clear_fit_is_not_called_a_trend():
    metrics = compute_revenue_metrics(_summary([1000, 1400, 900, 1300, 1000, 1350, 950, 1400, 1000, 1300, 900, 1450]))

    assert metrics["trend"]["direction"] == "STABLE"
    assert metrics["trend"]["r_squared"] < 0.3


def test_cov_matches_sample_standard_deviation():
    metrics = compute_revenue_metrics(_summary([800.0, 1200.0]))

    # mean 1000, sample stdev 282.84 -> CoV 28.3% (MODERATE)
    assert metrics["volatility"]["cov_percent"] == pytest.approx(28.3, abs=0.05)
    assert metrics["volatility"]["level"] == "MODERATE"


def test_weak_months_and_longest_streak():
    metrics = compute_revenue_metrics(_summary([1000, 1000, 500, 600, 700, 1000, 1000, 0, 1000, 1000, 1000, 1000]))

    weak = metrics["weak_months"]
    # mean = 9800 / 12 = 816.7; below: 500, 600, 700, 0; weak (< 653.3): 500, 600, 0
    assert weak["below_average"] == 4
    assert weak["weak"] == 3
    assert weak["zero_revenue"] == 1
    assert weak["longest_below_average_streak"] == 3


def test_concentration_levels_follow_doj_thresholds():
    high = compute_revenue_metrics(_summary([1000.0] * 6, client_concentration([700, 200, 100])))
    diverse = compute_revenue_metrics(_summary([1000.0] * 6, client_concentration([10.0] * 10)))

    assert high["client_concentration"]["level"] == "HIGH"
    assert diverse["client_concentration"]["hhi"] == 1000
    assert diverse["client_concentration"]["level"] == "UNCONCENTRATED"
    assert diverse["client_concentration"]["effective_clients"] == 10.0


def test_missing_client_data_is_reported_not_guessed():
    legacy = {"top_client_percent": 40.0, "top_3_clients_percent": 80.0, "distinct_clients": 5}

    metrics = compute_revenue_metrics(_summary([1000.0] * 6, legacy))

    assert metrics["client_concentration"]["hhi"] is None
    assert metrics["client_concentration"]["level"] == "UNKNOWN"


def test_short_history_is_flagged_and_too_short_for_trend():
    metrics = compute_revenue_metrics(_summary([1000.0, 1100.0]))

    assert metrics["trend"]["direction"] == "UNKNOWN"
    assert "Only 2 month(s) of history" in metrics["data_quality_notes"][0]


# ── Evidence, coverage and incomplete months ──────────────────────────────────
from datetime import date  # noqa: E402

from app.services.quant_service import complete_months, format_references  # noqa: E402


def _tx(platform, tx_id, day, amount, client):
    return {"platform": platform, "id": tx_id, "date": day, "amount": amount, "client": client}


def test_current_month_is_excluded_when_older_months_exist():
    series = [{"month": "2026-09", "total": 1000}, {"month": "2026-10", "total": 120}]

    complete, excluded = complete_months(series, today=date(2026, 10, 26))

    assert [m["month"] for m in complete] == ["2026-09"]
    assert excluded == "2026-10"


def test_only_current_month_is_kept_as_observed():
    series = [{"month": "2026-10", "total": 1646.57}]

    complete, excluded = complete_months(series, today=date(2026, 10, 26))

    assert complete == series and excluded is None


def test_partial_month_does_not_count_as_a_weak_month():
    summary = _summary([1000.0] * 11 + [150.0], start_year=2025, start_month=11)  # 2025-11 .. 2026-10

    metrics = compute_revenue_metrics(summary, today=date(2026, 10, 26))

    assert metrics["months_analyzed"] == 11
    assert metrics["weak_months"]["weak"] == 0
    assert "2026-10" in metrics["data_quality_notes"][0]


def test_evidence_cites_real_transactions_per_factor():
    summary = _summary([1000.0, 400.0, 1200.0], start_year=2026, start_month=6)
    summary["transactions"] = [
        _tx("STRIPE", "ch_big", "2026-06-03", 700.0, "Client 1"),
        _tx("STRIPE", "ch_small", "2026-06-20", 300.0, "Client 2"),
        _tx("PAYPAL", "PP_LOW", "2026-07-11", 400.0, "Client 1"),
        _tx("PAYPAL", "PP_HIGH", "2026-08-02", 1200.0, "Client 3"),
    ]

    evidence = compute_revenue_metrics(summary, today=date(2026, 10, 26))["evidence"]

    assert [t["id"] for t in evidence["income_stability"]["transactions"]] == ["PP_HIGH", "PP_LOW"]
    assert [t["id"] for t in evidence["growth_trend"]["transactions"]] == ["ch_big", "ch_small", "PP_HIGH"]
    assert [t["id"] for t in evidence["seasonality"]["transactions"]] == ["PP_LOW"]
    # Client 1 (700 + 400) and Client 3 (1200): Client 3 is the top client
    assert [t["id"] for t in evidence["client_concentration"]["transactions"]] == ["PP_HIGH"]
    assert format_references(evidence)[0] == "PAYPAL PP_HIGH · 2026-08-02 · 1,200.00 · Client 3"
    assert len(format_references(evidence)) == 4  # deduplicated


def test_short_source_is_described_not_extrapolated():
    summary = _summary([1000.0] * 12, start_year=2025, start_month=10)
    summary["source_breakdown"] = [
        {"platform": "STRIPE", "days_covered": 360, "first_date": "2025-10-01", "last_date": "2026-09-25", "transactions": 110},
        {"platform": "PAYPAL", "days_covered": 14, "first_date": "2026-10-13", "last_date": "2026-10-26", "transactions": 30},
    ]

    notes = compute_revenue_metrics(summary, today=date(2026, 10, 26))["data_quality_notes"]

    paypal_note = [n for n in notes if n.startswith("PayPal")]
    assert len(paypal_note) == 1
    assert "14 day(s)" in paypal_note[0] and "not annualised" in paypal_note[0]
    assert not any(n.startswith("Stripe") for n in notes)


def test_missing_ledger_is_reported():
    metrics = compute_revenue_metrics(_summary([1000.0] * 6), today=date(2026, 10, 26))

    assert metrics["evidence"] == {}
    assert any("re-sync" in n for n in metrics["data_quality_notes"])


# ── Payment integrity (grounded "reputation" factor) ───────────────────────────
def _integrity(gross, refunded, payments, refunded_payments, disputes):
    return {"gross": gross, "refunded": refunded, "payments": payments,
            "refunded_payments": refunded_payments, "disputes": disputes, "sources": ["STRIPE"]}


@pytest.mark.parametrize("data, level", [
    (_integrity(10_000, 100, 100, 2, 0), "LOW"),        # 1% refunded, no disputes
    (_integrity(10_000, 400, 100, 5, 0), "MODERATE"),   # 4% refunded
    (_integrity(10_000, 0, 100, 0, 1), "HIGH"),         # 1% disputed
    (_integrity(10_000, 1_200, 100, 9, 0), "HIGH"),     # 12% refunded
])
def test_payment_integrity_levels(data, level):
    summary = _summary([1000.0] * 12)
    summary["payment_integrity"] = data

    pi = compute_revenue_metrics(summary, today=date(2026, 10, 26))["payment_integrity"]

    assert pi["level"] == level
    assert pi["refund_rate_percent"] == round(data["refunded"] / data["gross"] * 100, 2)
    assert pi["history_months"] == 12


def test_payment_integrity_unknown_without_data():
    pi = compute_revenue_metrics(_summary([1000.0] * 6), today=date(2026, 10, 26))["payment_integrity"]

    assert pi["level"] == "UNKNOWN" and "not available" in pi["explanation"]
