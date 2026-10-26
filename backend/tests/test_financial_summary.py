from types import SimpleNamespace

from app.tasks.report_generation import _build_financial_summary


def _source(type_, details):
    return SimpleNamespace(id="src", type=type_, connection_details=details)


def test_source_without_data_contributes_nothing():
    summary = _build_financial_summary([_source("XERO", {})])

    assert summary["avg_monthly_revenue"] == 0
    assert summary["monthly_revenue_series"] == []
    assert summary["platform_breakdown"]["XERO"]["status"] == "NO_DATA"


def test_merges_monthly_series_across_sources():
    paypal = _source("PAYPAL", {
        "records_count": 3,
        "monthly_revenue_series": [{"month": "2026-10", "revenue": 300.0, "transactions": 3}],
        "client_concentration": {"top_client_percent": 50.0},
    })
    csv = _source("MANUAL_UPLOAD", {
        "monthly_revenue_series": [
            {"month": "2026-09", "revenue": 1000.0, "transactions": 2},
            {"month": "2026-10", "revenue": 200.0, "transactions": 1},
        ],
    })

    summary = _build_financial_summary([paypal, csv])

    assert summary["connected_platforms"] == ["PAYPAL", "MANUAL_UPLOAD"]
    assert summary["monthly_revenue_series"] == [
        {"month": "2026-09", "total": 1000.0, "transaction_count": 2},
        {"month": "2026-10", "total": 500.0, "transaction_count": 4},
    ]
    assert summary["client_concentration"] == {"top_client_percent": 50.0}


def test_fills_gaps_and_averages_over_the_whole_period():
    stripe = _source("STRIPE", {"monthly_revenue_series": [{"month": "2026-01", "revenue": 900.0, "transactions": 3}]})
    paypal = _source("PAYPAL", {"monthly_revenue_series": [{"month": "2026-03", "revenue": 300.0, "transactions": 1}]})

    summary = _build_financial_summary([stripe, paypal])

    assert [m["month"] for m in summary["monthly_revenue_series"]] == ["2026-01", "2026-02", "2026-03"]
    assert summary["monthly_revenue_series"][1]["total"] == 0
    assert summary["analysis_period_months"] == 3
    assert summary["avg_monthly_revenue"] == 400.0


def test_client_concentration_combines_every_source():
    stripe = _source("STRIPE", {
        "monthly_revenue_series": [{"month": "2026-01", "revenue": 800.0, "transactions": 2}],
        "client_revenue": [600.0, 200.0],
    })
    paypal = _source("PAYPAL", {
        "monthly_revenue_series": [{"month": "2026-01", "revenue": 200.0, "transactions": 1}],
        "client_revenue": [200.0],
    })

    summary = _build_financial_summary([stripe, paypal])

    # shares 60 / 20 / 20 -> 3600 + 400 + 400
    assert summary["client_concentration"] == {
        "top_client_percent": 60.0, "top_3_clients_percent": 100.0, "distinct_clients": 3, "hhi": 4400,
    }
    assert "computed_growth_trend" not in summary
