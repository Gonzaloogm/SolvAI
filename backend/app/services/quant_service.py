"""Deterministic revenue metrics computed from the user's real data.

These figures are the single source of truth for a report: the underwriter is
told to ground its scores in them, the PDF prints them and the UI shows them.
Every metric carries the thresholds used to interpret it, so a reader can check
the reasoning instead of trusting a number.
"""
from __future__ import annotations

import hashlib
import statistics
from collections import defaultdict
from datetime import date, datetime, timezone
from typing import Any

# Lender rule of thumb for freelancers: income CoV under 25% reads as stable
COV_STABLE_PCT = 25.0
COV_VOLATILE_PCT = 50.0

# US DOJ / FTC merger guidelines, the usual reading of HHI (0-10,000)
HHI_UNCONCENTRATED = 1500
HHI_HIGHLY_CONCENTRATED = 2500

# Trend: slope as % of average monthly revenue, only trusted with a decent fit
TREND_FLAT_PCT_PER_MONTH = 1.0
TREND_MIN_R_SQUARED = 0.3

WEAK_MONTH_RATIO = 0.8          # a month under 80% of average counts as weak
MIN_MONTHS_FOR_TREND = 3
SHORT_HISTORY_MONTHS = 6
SHORT_SOURCE_DAYS = 90          # a source with less history is reported as-is, never annualised

MAX_STORED_TRANSACTIONS = 500   # per source, most recent first
REFS_PER_FACTOR = 4


def client_key(raw: str) -> str:
    """Stable pseudonym for a payer (customer ID, e-mail or account ID): never store the raw value."""
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def transaction_ledger(transactions: list[dict]) -> list[dict]:
    """Successful payments kept with a source snapshot so reports can cite them by ID."""
    rows = [
        {"id": t["id"], "date": t["date"], "amount": round(t["amount"], 2), "client": t["client"]}
        for t in transactions
    ]
    return sorted(rows, key=lambda t: t["date"], reverse=True)[:MAX_STORED_TRANSACTIONS]


def complete_months(series: list[dict], today: date | None = None) -> tuple[list[dict], str | None]:
    """Drop the current calendar month, which is still incomplete, when older months exist."""
    current = (today or datetime.now(timezone.utc).date()).strftime("%Y-%m")
    complete = [m for m in series if m["month"] != current]
    if complete and len(complete) < len(series):
        return complete, current
    return series, None


def client_concentration(client_revenue: list[float]) -> dict[str, Any] | None:
    """Top-client shares and Herfindahl-Hirschman Index from per-client revenue."""
    amounts = sorted((a for a in client_revenue if a > 0), reverse=True)
    total = sum(amounts)
    if not total:
        return None
    shares = [a / total * 100 for a in amounts]
    hhi = sum(s * s for s in shares)
    return {
        "top_client_percent": round(shares[0], 1),
        "top_3_clients_percent": round(sum(shares[:3]), 1),
        "distinct_clients": len(amounts),
        "hhi": round(hhi),
    }


def _linear_trend(values: list[float]) -> tuple[float, float]:
    """Least-squares slope (units per month) and R² for an evenly spaced series."""
    n = len(values)
    xs = range(n)
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    sxx = sum((x - x_mean) ** 2 for x in xs)
    sxy = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values))
    slope = sxy / sxx
    ss_tot = sum((y - y_mean) ** 2 for y in values)
    ss_res = sum((y - (y_mean + slope * (x - x_mean))) ** 2 for x, y in zip(xs, values))
    r_squared = 1 - ss_res / ss_tot if ss_tot else 0.0
    return slope, r_squared


def _volatility(revenues: list[float], mean: float) -> dict[str, Any]:
    if len(revenues) < 2 or not mean:
        return {"cov_percent": None, "level": "UNKNOWN",
                "explanation": "At least two months of revenue are needed to measure volatility."}
    cov = statistics.stdev(revenues) / mean * 100
    level = "LOW" if cov < COV_STABLE_PCT else "MODERATE" if cov < COV_VOLATILE_PCT else "HIGH"
    return {
        "cov_percent": round(cov, 1),
        "std_dev": round(statistics.stdev(revenues), 2),
        "level": level,
        "thresholds": {"stable_below": COV_STABLE_PCT, "volatile_above": COV_VOLATILE_PCT},
        "explanation": (
            f"Monthly revenue deviates {cov:.1f}% from its average (coefficient of variation). "
            f"Lenders usually treat freelance income under {COV_STABLE_PCT:.0f}% as stable."
        ),
    }


def _trend(revenues: list[float], mean: float) -> dict[str, Any]:
    if len(revenues) < MIN_MONTHS_FOR_TREND or not mean:
        return {"direction": "UNKNOWN",
                "explanation": f"At least {MIN_MONTHS_FOR_TREND} months are needed to fit a trend."}
    slope, r2 = _linear_trend(revenues)
    pct = slope / mean * 100
    if abs(pct) < TREND_FLAT_PCT_PER_MONTH or r2 < TREND_MIN_R_SQUARED:
        direction = "STABLE"
    else:
        direction = "GROWING" if pct > 0 else "DECLINING"
    fit = "a clear" if r2 >= TREND_MIN_R_SQUARED else "a weak"
    return {
        "direction": direction,
        "slope_per_month": round(slope, 2),
        "slope_percent_per_month": round(pct, 2),
        "r_squared": round(r2, 2),
        "thresholds": {"flat_within_percent": TREND_FLAT_PCT_PER_MONTH, "min_r_squared": TREND_MIN_R_SQUARED},
        "explanation": (
            f"A linear regression over {len(revenues)} months gives {round(slope) + 0.0:+,.0f} per month "
            f"({round(pct, 1) + 0.0:+.1f}% of average revenue) with {fit} fit (R² {r2:.2f})."
        ),
    }


def _weak_months(series: list[dict], mean: float) -> dict[str, Any]:
    below = [m["month"] for m in series if m["total"] < mean]
    weak = [m["month"] for m in series if m["total"] < mean * WEAK_MONTH_RATIO]
    zero = [m["month"] for m in series if m["total"] <= 0]

    longest = current = 0
    for m in series:
        current = current + 1 if m["total"] < mean else 0
        longest = max(longest, current)

    return {
        "below_average": len(below),
        "weak": len(weak),
        "weak_months": weak,
        "zero_revenue": len(zero),
        "longest_below_average_streak": longest,
        "thresholds": {"weak_below_ratio_of_average": WEAK_MONTH_RATIO},
        "explanation": (
            f"{len(below)} of {len(series)} months were below average; {len(weak)} fell under "
            f"{WEAK_MONTH_RATIO:.0%} of it and the longest run below average lasted {longest} month(s)."
        ),
    }


# Card networks start monitoring merchants at ~1% chargebacks; refunds above a
# few percent of revenue suggest delivery or quality problems
DISPUTE_RATE_HIGH_PCT = 1.0
REFUND_RATE_MODERATE_PCT = 3.0
REFUND_RATE_HIGH_PCT = 10.0


def _payment_integrity(summary: dict[str, Any], months: int) -> dict[str, Any]:
    """Refunds, disputes and history length: the grounded "reputation" factor."""
    data = summary.get("payment_integrity")
    if not data or not data.get("payments"):
        return {"level": "UNKNOWN",
                "explanation": "Refund and dispute data is not available for the connected sources."}
    refund_rate = data["refunded"] / data["gross"] * 100 if data["gross"] else 0.0
    dispute_rate = data["disputes"] / data["payments"] * 100
    if dispute_rate >= DISPUTE_RATE_HIGH_PCT or refund_rate >= REFUND_RATE_HIGH_PCT:
        level = "HIGH"
    elif data["disputes"] or refund_rate >= REFUND_RATE_MODERATE_PCT:
        level = "MODERATE"
    else:
        level = "LOW"
    return {
        "level": level,  # risk level: LOW is good
        "refund_rate_percent": round(refund_rate, 2),
        "refunded_payments": data["refunded_payments"],
        "disputes": data["disputes"],
        "dispute_rate_percent": round(dispute_rate, 2),
        "payments": data["payments"],
        "history_months": months,
        "sources": data.get("sources", []),
        "thresholds": {
            "dispute_rate_high_percent": DISPUTE_RATE_HIGH_PCT,
            "refund_rate_moderate_percent": REFUND_RATE_MODERATE_PCT,
            "refund_rate_high_percent": REFUND_RATE_HIGH_PCT,
        },
        "explanation": (
            f"{data['refunded_payments']} of {data['payments']} payments were refunded "
            f"({refund_rate:.1f}% of gross revenue) and {data['disputes']} were disputed "
            f"({dispute_rate:.2f}%), across {months} month(s) of history."
        ),
    }


def _concentration(summary: dict[str, Any]) -> dict[str, Any]:
    cc = summary.get("client_concentration")
    if not isinstance(cc, dict) or cc.get("hhi") is None:
        return {"hhi": None, "level": "UNKNOWN",
                "explanation": "Client-level revenue is not available for the connected sources."}
    hhi = cc["hhi"]
    level = ("UNCONCENTRATED" if hhi < HHI_UNCONCENTRATED
             else "MODERATE" if hhi <= HHI_HIGHLY_CONCENTRATED else "HIGH")
    return {
        **cc,
        "effective_clients": round(10_000 / hhi, 1) if hhi else None,
        "level": level,
        "thresholds": {"unconcentrated_below": HHI_UNCONCENTRATED, "high_above": HHI_HIGHLY_CONCENTRATED},
        "explanation": (
            f"HHI {hhi:,} across {cc['distinct_clients']} clients: revenue behaves like "
            f"{10_000 / hhi:.1f} equally sized clients. The top client brings {cc['top_client_percent']}%."
        ),
    }


def _ref(tx: dict) -> dict:
    return {k: tx[k] for k in ("platform", "id", "date", "amount", "client")}


def _evidence(series: list[dict], transactions: list[dict], weak: dict | None) -> dict[str, Any]:
    """Transaction IDs behind each factor, picked by fixed rules (never by the AI)."""
    if not series or not transactions:
        return {}
    by_month = defaultdict(list)
    for tx in transactions:
        by_month[tx["date"][:7]].append(tx)

    def largest(month: str, n: int) -> list[dict]:
        return [_ref(t) for t in sorted(by_month[month], key=lambda t: t["amount"], reverse=True)[:n]]

    high = max(series, key=lambda m: m["total"])
    low = min(series, key=lambda m: m["total"])
    first, last = series[0], series[-1]
    weak_list = (weak or {}).get("weak_months") or [low["month"]]

    revenue_by_client = defaultdict(float)
    for tx in transactions:
        revenue_by_client[tx["client"]] += tx["amount"]
    top_client = max(revenue_by_client, key=revenue_by_client.get)

    return {
        "income_stability": {
            "basis": f"Highest month {high['month']} ({high['total']:,.2f}) and lowest month {low['month']} ({low['total']:,.2f}).",
            "transactions": largest(high["month"], 2) + largest(low["month"], 2),
        },
        "growth_trend": {
            "basis": f"Start of the period ({first['month']}: {first['total']:,.2f}) against the end ({last['month']}: {last['total']:,.2f}).",
            "transactions": largest(first["month"], 2) + largest(last["month"], 2),
        },
        "seasonality": {
            "basis": f"Weakest months: {', '.join(weak_list[:3])}.",
            "transactions": [r for m in weak_list[:REFS_PER_FACTOR] for r in largest(m, 1)],
        },
        "client_concentration": {
            "basis": f"Largest payments from the top client ({top_client}, {revenue_by_client[top_client]:,.2f} in total).",
            "transactions": [
                _ref(t) for t in sorted((t for t in transactions if t["client"] == top_client),
                                        key=lambda t: t["amount"], reverse=True)[:REFS_PER_FACTOR]
            ],
        },
    }


def _platform_name(platform: str) -> str:
    return {"PAYPAL": "PayPal", "MANUAL_UPLOAD": "Bank statement"}.get(platform, platform.title())


def _source_notes(summary: dict[str, Any]) -> list[str]:
    notes = []
    for source in summary.get("source_breakdown") or []:
        days = source.get("days_covered")
        if days is not None and days < SHORT_SOURCE_DAYS:
            notes.append(
                f"{_platform_name(source['platform'])} has only {days} day(s) of history "
                f"({source['first_date']} to {source['last_date']}, {source['transactions']} payment(s)). "
                "Its figures are shown as observed and are not annualised or extrapolated."
            )
    return notes


def compute_revenue_metrics(summary: dict[str, Any], today: date | None = None) -> dict[str, Any]:
    """All deterministic metrics for a financial summary built by _build_financial_summary."""
    observed = sorted(summary.get("monthly_revenue_series") or [], key=lambda m: m["month"])
    series, excluded_month = complete_months(observed, today)
    revenues = [float(m["total"]) for m in series]
    mean = sum(revenues) / len(revenues) if revenues else 0.0

    data_quality = []
    if excluded_month:
        data_quality.append(
            f"The current month ({excluded_month}) is still incomplete and is excluded from "
            "averages, volatility, trend and weak-month analysis."
        )
    if len(series) < SHORT_HISTORY_MONTHS:
        data_quality.append(
            f"Only {len(series)} month(s) of history: trend and volatility are indicative, not conclusive."
        )
    data_quality += _source_notes(summary)
    weak = _weak_months(series, mean) if series else None
    evidence = _evidence(series, summary.get("transactions") or [], weak)
    if series and not evidence:
        data_quality.append(
            "Transaction-level references are unavailable for these sources; re-sync them to cite payments by ID."
        )

    return {
        "months_analyzed": len(series),
        "period": {"from": series[0]["month"], "to": series[-1]["month"]} if series else None,
        "average_monthly_revenue": round(mean, 2),
        "median_monthly_revenue": round(statistics.median(revenues), 2) if revenues else 0.0,
        "volatility": _volatility(revenues, mean),
        "trend": _trend(revenues, mean),
        "weak_months": weak,
        "client_concentration": _concentration(summary),
        "payment_integrity": _payment_integrity(summary, len(series)),
        "source_breakdown": summary.get("source_breakdown") or [],
        "evidence": evidence,
        "data_quality_notes": data_quality,
    }


def format_references(evidence: dict[str, Any]) -> list[str]:
    """Unique, human-readable transaction references for the report appendix."""
    seen, refs = set(), []
    for factor in evidence.values():
        for tx in factor["transactions"]:
            key = (tx["platform"], tx["id"])
            if key not in seen:
                seen.add(key)
                refs.append(f"{tx['platform']} {tx['id']} · {tx['date']} · {tx['amount']:,.2f} · {tx['client']}")
    return refs
