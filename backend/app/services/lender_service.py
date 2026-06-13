from __future__ import annotations

from typing import Any, List


# ── Lender catalogue ──────────────────────────────────────────────────────────
_PREMIUM_LENDERS: List[dict[str, Any]] = [
    {
        "lender_name": "AltFi Credit",
        "lender_type": "Alternative Lender",
        "max_loan_amount": 50_000.0,
        "interest_rate_min": 4.5,
        "interest_rate_max": 7.9,
        "apply_url": "https://altfi.example.com/apply",
    },
    {
        "lender_name": "EuroCapital Partners",
        "lender_type": "Fintech Lender",
        "max_loan_amount": 50_000.0,
        "interest_rate_min": 4.9,
        "interest_rate_max": 8.0,
        "apply_url": "https://eurocapital.example.com/apply",
    },
    {
        "lender_name": "NordLend",
        "lender_type": "Nordic Alternative Finance",
        "max_loan_amount": 45_000.0,
        "interest_rate_min": 5.0,
        "interest_rate_max": 7.5,
        "apply_url": "https://nordlend.example.com/apply",
    },
]

_STANDARD_LENDERS: List[dict[str, Any]] = [
    {
        "lender_name": "GrowthBridge",
        "lender_type": "SME Fintech Lender",
        "max_loan_amount": 25_000.0,
        "interest_rate_min": 8.5,
        "interest_rate_max": 13.9,
        "apply_url": "https://growthbridge.example.com/apply",
    },
    {
        "lender_name": "SME Funding EU",
        "lender_type": "EU SME Specialist",
        "max_loan_amount": 25_000.0,
        "interest_rate_min": 9.0,
        "interest_rate_max": 14.5,
        "apply_url": "https://smefunding.example.eu/apply",
    },
    {
        "lender_name": "FreelanceCapital",
        "lender_type": "Freelancer-Focused Lender",
        "max_loan_amount": 20_000.0,
        "interest_rate_min": 8.0,
        "interest_rate_max": 15.0,
        "apply_url": "https://freelancecapital.example.com/apply",
    },
]

_MICRO_LENDERS: List[dict[str, Any]] = [
    {
        "lender_name": "MicroStart",
        "lender_type": "Microfinance Institution",
        "max_loan_amount": 10_000.0,
        "interest_rate_min": 15.0,
        "interest_rate_max": 22.0,
        "apply_url": "https://microstart.example.com/apply",
    },
    {
        "lender_name": "Qonto Advance",
        "lender_type": "Embedded Finance",
        "max_loan_amount": 8_000.0,
        "interest_rate_min": 17.0,
        "interest_rate_max": 25.0,
        "apply_url": "https://qonto.example.com/advance/apply",
    },
]


# ── Criteria helper ───────────────────────────────────────────────────────────
def _build_criteria(score: int) -> List[str]:
    criteria: List[str] = []
    if score >= 40:
        criteria.append("Minimum income threshold met")
        criteria.append("Active trading history > 6 months")
    if score >= 55:
        criteria.append("Consistent revenue pattern detected")
        criteria.append("Debt-service coverage ratio acceptable")
    if score >= 70:
        criteria.append("Income diversification across multiple clients")
        criteria.append("Positive growth trajectory confirmed")
        criteria.append("Low payment-failure rate")
    if score >= 85:
        criteria.append("Premium tier: low-risk profile")
    return criteria


# ── Public function ───────────────────────────────────────────────────────────
def get_lender_matches(score: int) -> List[dict[str, Any]]:
    """
    Return a list of lender match dicts based on the solvency *score*.

    Score bands:
        70-100  → 3 premium lenders  (4–8 % APR,  up to €50,000)
        40-69   → 3 standard lenders (8–15 % APR, up to €25,000)
        0-39    → 2 micro lenders    (15–25 % APR, up to €10,000)
    """
    criteria = _build_criteria(score)

    if score >= 70:
        catalogue = _PREMIUM_LENDERS
    elif score >= 40:
        catalogue = _STANDARD_LENDERS
    else:
        catalogue = _MICRO_LENDERS

    matches: List[dict[str, Any]] = []
    for lender in catalogue:
        matches.append(
            {
                **lender,
                "criteria_met": criteria,
            }
        )
    return matches
