"""Revenue & cash-flow statement built only from the user's connected data.

Revenue comes from every connected source. Money going out is only known when a
bank statement (CSV) is connected, and it is reported as "outflows", not
expenses: a bank account mixes business costs, transfers and personal spending.
Without a bank statement the statement says so and shows no net figure.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from app.services.quant_service import complete_months, compute_revenue_metrics


class StatementUnavailable(Exception):
    """No connected source has revenue data."""


def _month_label(month: str) -> str:
    return datetime.strptime(month, "%Y-%m").strftime("%b %Y")


def build_pl_statement(summary: dict[str, Any], months: int = 12, today: date | None = None) -> dict[str, Any]:
    series = summary.get("monthly_revenue_series") or []
    if not series:
        raise StatementUnavailable(
            "No revenue data found. Connect Stripe or PayPal, or upload a bank statement, to build a statement."
        )

    window = series[-months:]
    windowed = {**summary, "monthly_revenue_series": window}
    metrics = compute_revenue_metrics(windowed, today)
    full, partial_month = complete_months(window, today)

    # Outflows are only known for months covered by an uploaded bank statement;
    # elsewhere they are unknown (None), not zero
    covered = [m["month"] for m in series if "outflows" in m]
    has_outflows = bool(summary.get("outflow_sources")) and bool(covered)
    rows = []
    for m in window:
        in_statement = has_outflows and covered[0] <= m["month"] <= covered[-1]
        outflows = round(m.get("outflows", 0.0), 2) if in_statement else None
        rows.append({
            "month": _month_label(m["month"]),
            "period": m["month"],
            "revenue": round(m["total"], 2),
            "payments": m.get("transaction_count", 0),
            "outflows": outflows,
            "net": round(m["total"] - outflows, 2) if outflows is not None else None,
            "partial": m["month"] == partial_month,
        })

    total_revenue = round(sum(r["revenue"] for r in rows), 2)
    covered_rows = [r for r in rows if r["outflows"] is not None]
    has_outflows = has_outflows and bool(covered_rows)  # statement may fall outside the window
    total_outflows = round(sum(r["outflows"] for r in covered_rows), 2) if has_outflows else None
    net_cash_flow = round(sum(r["net"] for r in covered_rows), 2) if has_outflows else None
    full_rows = [r for r in rows if not r["partial"]] or rows
    highest = max(full_rows, key=lambda r: r["revenue"])
    lowest = min(full_rows, key=lambda r: r["revenue"])

    trend = metrics["trend"]
    concentration = metrics["client_concentration"]

    sentences = [
        f"Revenue totalled {total_revenue:,.2f} over {len(full)} complete month(s), "
        f"averaging {metrics['average_monthly_revenue']:,.2f} per month."
    ]
    if trend.get("direction") not in (None, "UNKNOWN"):
        sentences.append(
            f"The trend is {trend['direction'].lower()} ({trend['slope_percent_per_month']:+.1f}% of average "
            f"revenue per month, R² {trend['r_squared']:.2f})."
        )
    if concentration.get("hhi") is not None:
        sentences.append(
            f"The top client brings {concentration['top_client_percent']}% of revenue (HHI {concentration['hhi']:,})."
        )
    if not has_outflows:
        sentences.append("No bank statement is connected, so outflows and net cash flow are not reported.")

    notes = list(metrics["data_quality_notes"])
    if has_outflows:
        notes.append(
            f"Outflows come from uploaded bank statements covering {covered_rows[0]['period']} to "
            f"{covered_rows[-1]['period']} and may include transfers and personal spending, not only "
            "business expenses. Net cash flow is computed over those months only."
        )

    return {
        "period_start": window[0]["month"],
        "period_end": window[-1]["month"],
        "currency": summary.get("currency", "EUR"),
        "revenue": {
            "total": total_revenue,
            "avg_monthly": metrics["average_monthly_revenue"],
            "monthly": rows,
            "highest_month": {"month": highest["month"], "revenue": highest["revenue"]},
            "lowest_month": {"month": lowest["month"], "revenue": lowest["revenue"]},
        },
        "outflows": {
            "available": has_outflows,
            "total": total_outflows,
            "sources": summary.get("outflow_sources") or [],
            "months_covered": [r["period"] for r in covered_rows],
        },
        # Net only over the months the bank statement covers
        "net_cash_flow": net_cash_flow,
        "growth": {
            "direction": trend.get("direction"),
            "slope_percent_per_month": trend.get("slope_percent_per_month"),
            "r_squared": trend.get("r_squared"),
        },
        "volatility": {
            "cov_percent": metrics["volatility"].get("cov_percent"),
            "level": metrics["volatility"].get("level"),
        },
        "client_analysis": {
            "total_clients": concentration.get("distinct_clients"),
            "top_client_share": concentration.get("top_client_percent"),
            "top_3_share": concentration.get("top_3_clients_percent"),
            "hhi": concentration.get("hhi"),
            "concentration_risk": concentration.get("level"),
        },
        "by_source": summary.get("source_breakdown") or [],
        "data_sources": summary.get("connected_platforms") or [],
        "notes": notes,
        "summary_text": " ".join(sentences),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
