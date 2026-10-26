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
