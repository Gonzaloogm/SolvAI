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
    assert metrics["data_quality_notes"] == []


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
