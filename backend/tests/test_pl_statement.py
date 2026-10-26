from datetime import date

import pytest

from app.services.csv_service import CSVService
from app.services.pl_statement import StatementUnavailable, build_pl_statement

TODAY = date(2026, 10, 26)


def _summary(revenues, outflows=None, start="2025-11"):
    year, month = map(int, start.split("-"))
    series = []
    for i, revenue in enumerate(revenues):
        y, m = divmod(month - 1 + i, 12)
        row = {"month": f"{year + y}-{m + 1:02d}", "total": revenue, "transaction_count": 2}
        if outflows is not None:
            row["outflows"] = outflows[i]
        series.append(row)
    return {
        "monthly_revenue_series": series,
        "currency": "EUR",
        "connected_platforms": ["STRIPE"],
        "outflow_sources": ["MANUAL_UPLOAD"] if outflows is not None else [],
        "client_concentration": {"top_client_percent": 40.0, "top_3_clients_percent": 80.0, "distinct_clients": 5, "hhi": 2400},
    }


def test_no_revenue_is_an_error_not_an_empty_statement():
    with pytest.raises(StatementUnavailable, match="No revenue data"):
        build_pl_statement({"monthly_revenue_series": []}, today=TODAY)


def test_revenue_only_statement_reports_no_outflows_or_net():
    statement = build_pl_statement(_summary([1000.0] * 11 + [300.0]), today=TODAY)

    assert statement["revenue"]["total"] == 11300.0
    assert statement["revenue"]["avg_monthly"] == 1000.0           # partial October excluded
    assert statement["revenue"]["monthly"][-1]["partial"] is True
    assert statement["outflows"] == {"available": False, "total": None, "sources": [], "months_covered": []}
    assert statement["net_cash_flow"] is None
    assert all(r["outflows"] is None and r["net"] is None for r in statement["revenue"]["monthly"])
    assert "No bank statement is connected" in statement["summary_text"]
    assert statement["client_analysis"]["hhi"] == 2400
    assert statement["growth"]["direction"] == "STABLE"


def test_bank_outflows_give_net_cash_flow():
    statement = build_pl_statement(_summary([1000.0, 1200.0, 900.0], outflows=[400.0, 0.0, 950.0], start="2026-06"), today=TODAY)

    rows = statement["revenue"]["monthly"]
    assert [r["net"] for r in rows] == [600.0, 1200.0, -50.0]
    assert statement["outflows"]["total"] == 1350.0
    assert statement["net_cash_flow"] == 1750.0
    assert any("transfers and personal spending" in n for n in statement["notes"])


def test_window_limits_months():
    statement = build_pl_statement(_summary([float(i) for i in range(1, 13)]), months=3, today=TODAY)

    assert [r["period"] for r in statement["revenue"]["monthly"]] == ["2026-08", "2026-09", "2026-10"]
    assert statement["period_start"] == "2026-08"


def test_nothing_is_invented():
    statement = build_pl_statement(_summary([1000.0] * 12), today=TODAY)
    text = repr(statement)

    for made_up in ("yoy_change", "25.4", "expenses", "mom_avg"):
        assert made_up not in text


def test_csv_keeps_outflows_separate_from_revenue():
    csv = b"Date,Description,Amount\n2026-09-01,Invoice 1,1500.00\n2026-09-03,Rent,-700.00\n2026-09-20,Invoice 2,500.00\n2026-10-02,Tools,-120.50\n"

    series = CSVService().parse_file(csv)["monthly_revenue_series"]

    assert series == [
        {"month": "2026-09", "revenue": 2000.0, "transactions": 2, "outflows": 700.0},
        {"month": "2026-10", "revenue": 0.0, "transactions": 0, "outflows": 120.5},
    ]


def test_months_outside_the_bank_statement_have_unknown_outflows():
    summary = _summary([1000.0, 1000.0, 1000.0, 1000.0], start="2026-06")
    summary["outflow_sources"] = ["MANUAL_UPLOAD"]
    summary["monthly_revenue_series"][2]["outflows"] = 300.0   # statement covers Aug only

    statement = build_pl_statement(summary, today=TODAY)

    rows = {r["period"]: r for r in statement["revenue"]["monthly"]}
    assert rows["2026-06"]["outflows"] is None and rows["2026-06"]["net"] is None
    assert rows["2026-08"]["outflows"] == 300.0 and rows["2026-08"]["net"] == 700.0
    assert statement["outflows"]["months_covered"] == ["2026-08"]
    assert statement["net_cash_flow"] == 700.0
