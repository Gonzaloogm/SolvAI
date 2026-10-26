from datetime import date
from types import SimpleNamespace

from app.tasks.report_generation import _build_financial_summary

TODAY = date(2026, 10, 26)


def _source(type_, details):
    return SimpleNamespace(id="src", type=type_, connection_details=details)


def test_source_without_data_contributes_nothing():
    summary = _build_financial_summary(today=TODAY, sources=[_source("XERO", {})])

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

    summary = _build_financial_summary(today=TODAY, sources=[paypal, csv])

    assert summary["connected_platforms"] == ["PAYPAL", "MANUAL_UPLOAD"]
    assert summary["monthly_revenue_series"] == [
        {"month": "2026-09", "total": 1000.0, "transaction_count": 2},
        {"month": "2026-10", "total": 500.0, "transaction_count": 4},
    ]
    assert summary["client_concentration"] == {"top_client_percent": 50.0}


def test_fills_gaps_and_averages_over_the_whole_period():
    stripe = _source("STRIPE", {"monthly_revenue_series": [{"month": "2026-01", "revenue": 900.0, "transactions": 3}]})
    paypal = _source("PAYPAL", {"monthly_revenue_series": [{"month": "2026-03", "revenue": 300.0, "transactions": 1}]})

    summary = _build_financial_summary(today=TODAY, sources=[stripe, paypal])

    months = [m["month"] for m in summary["monthly_revenue_series"]]
    # Gaps are zero and the series runs to the current month, so stopped revenue shows up
    assert months[:3] == ["2026-01", "2026-02", "2026-03"] and months[-1] == "2026-10"
    assert summary["monthly_revenue_series"][1]["total"] == 0
    assert summary["analysis_period_months"] == 10
    # 1,200 over the 9 complete months (the current month is excluded)
    assert summary["avg_monthly_revenue"] == round(1200 / 9, 2)


def test_client_concentration_combines_every_source():
    stripe = _source("STRIPE", {
        "monthly_revenue_series": [{"month": "2026-01", "revenue": 800.0, "transactions": 2}],
        "client_revenue": [600.0, 200.0],
    })
    paypal = _source("PAYPAL", {
        "monthly_revenue_series": [{"month": "2026-01", "revenue": 200.0, "transactions": 1}],
        "client_revenue": [200.0],
    })

    summary = _build_financial_summary(today=TODAY, sources=[stripe, paypal])

    # shares 60 / 20 / 20 -> 3600 + 400 + 400
    assert summary["client_concentration"] == {
        "top_client_percent": 60.0, "top_3_clients_percent": 100.0, "distinct_clients": 3, "hhi": 4400,
    }
    assert "computed_growth_trend" not in summary


def test_ledgers_are_merged_with_cross_source_client_labels_and_breakdown():
    stripe = _source("STRIPE", {
        "monthly_revenue_series": [{"month": "2026-08", "revenue": 900.0, "transactions": 2}],
        "transactions": [
            {"id": "ch_1", "date": "2026-08-01", "amount": 600.0, "client": "aaa"},
            {"id": "ch_2", "date": "2026-08-15", "amount": 300.0, "client": "bbb"},
        ],
    })
    paypal = _source("PAYPAL", {
        "monthly_revenue_series": [{"month": "2026-09", "revenue": 100.0, "transactions": 1}],
        "transactions": [{"id": "PP_1", "date": "2026-09-20", "amount": 100.0, "client": "aaa"}],
    })

    summary = _build_financial_summary(today=TODAY, sources=[stripe, paypal])

    labels = {tx["id"]: (tx["platform"], tx["client"]) for tx in summary["transactions"]}
    # Same pseudonym on different platforms is a different client
    assert labels == {"ch_1": ("STRIPE", "Client 1"), "ch_2": ("STRIPE", "Client 2"), "PP_1": ("PAYPAL", "Client 3")}
    assert [tx["id"] for tx in summary["transactions"]] == ["PP_1", "ch_2", "ch_1"]  # newest first

    stripe_row, paypal_row = summary["source_breakdown"]
    assert stripe_row == {
        "platform": "STRIPE", "total_revenue": 900.0, "share_percent": 90.0, "transactions": 2,
        "months_covered": 1, "first_date": "2026-08-01", "last_date": "2026-08-15", "days_covered": 15,
    }
    assert paypal_row["share_percent"] == 10.0 and paypal_row["days_covered"] == 1


def test_revenue_that_stopped_shows_as_zero_months():
    stripe = _source("STRIPE", {"monthly_revenue_series": [
        {"month": f"2026-0{m}", "revenue": 1000.0, "transactions": 2} for m in range(1, 7)
    ]})

    summary = _build_financial_summary(today=TODAY, sources=[stripe])

    tail = [(m["month"], m["total"]) for m in summary["monthly_revenue_series"][-4:]]
    assert tail == [("2026-07", 0), ("2026-08", 0), ("2026-09", 0), ("2026-10", 0)]
