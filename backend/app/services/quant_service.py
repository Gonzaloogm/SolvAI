"""Deterministic revenue metrics computed from the user's real data.

These figures are the single source of truth for a report: the underwriter is
told to ground its scores in them, the PDF prints them and the UI shows them.
Every metric carries the thresholds used to interpret it, so a reader can check
the reasoning instead of trusting a number.
"""
from __future__ import annotations

import statistics
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
        "annualised_change_percent": round(pct * 12, 1),
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


def compute_revenue_metrics(summary: dict[str, Any]) -> dict[str, Any]:
    """All deterministic metrics for a financial summary built by _build_financial_summary."""
    series = sorted(summary.get("monthly_revenue_series") or [], key=lambda m: m["month"])
    revenues = [float(m["total"]) for m in series]
    mean = sum(revenues) / len(revenues) if revenues else 0.0

    data_quality = []
    if len(series) < SHORT_HISTORY_MONTHS:
        data_quality.append(
            f"Only {len(series)} month(s) of history: trend and volatility are indicative, not conclusive."
        )

    return {
        "months_analyzed": len(series),
        "period": {"from": series[0]["month"], "to": series[-1]["month"]} if series else None,
        "average_monthly_revenue": round(mean, 2),
        "median_monthly_revenue": round(statistics.median(revenues), 2) if revenues else 0.0,
        "volatility": _volatility(revenues, mean),
        "trend": _trend(revenues, mean),
        "weak_months": _weak_months(series, mean) if series else None,
        "client_concentration": _concentration(summary),
        "data_quality_notes": data_quality,
    }
