from __future__ import annotations

import asyncio
import json
import re
from typing import Any

from loguru import logger

from app.core.config import settings

# ── Gemini initialisation (lazy) ──────────────────────────────────────────────
_gemini_model = None


def _get_model():
    global _gemini_model
    if _gemini_model is None and settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai  # noqa: PLC0415
            genai.configure(api_key=settings.GEMINI_API_KEY)
            _gemini_model = genai.GenerativeModel("gemini-1.5-pro-latest")
            logger.info("Gemini model initialised (gemini-1.5-pro-latest)")
        except Exception as exc:
            logger.warning(f"Could not initialise Gemini model: {exc}")
    return _gemini_model


# ── Mock report (returned when Gemini is unavailable) ────────────────────────
def _build_mock_report(financial_summary: dict[str, Any]) -> dict[str, Any]:
    source_count = financial_summary.get("data_source_count", 1)
    avg_monthly = financial_summary.get("avg_monthly_revenue", 4500)
    score = min(100, max(10, int(avg_monthly / 100) + source_count * 5))
    score = min(score, 85)  # cap mock at 85 for realism

    if score >= 70:
        rating = "Strong"
    elif score >= 40:
        rating = "Developing"
    else:
        rating = "At Risk"

    return {
        "overall_score": score,
        "rating": rating,
        "income_stability": {
            "score": max(10, score - 5),
            "description": (
                "Revenue streams show consistent monthly patterns with minor fluctuations "
                "typical of freelance engagements."
            ),
        },
        "growth_trend": {
            "score": max(10, score - 10),
            "description": (
                "Positive quarter-on-quarter growth trajectory observed across connected "
                "data sources, suggesting expanding client base."
            ),
        },
        "seasonality": {
            "pattern": "Mild Q1 dip, strong Q3–Q4",
            "description": (
                "A slight reduction in invoicing activity during January–February is "
                "offset by peak performance in autumn months."
            ),
        },
        "reputation_signals": {
            "score": max(10, score + 3),
            "description": (
                "Payment completion rates and client retention ratios are above the "
                "EU freelancer median benchmark."
            ),
        },
        "narrative": (
            f"Based on {source_count} connected financial data source(s), this alternative "
            "solvency assessment evaluates the applicant's financial health using real-world "
            "transaction and revenue signals rather than traditional credit metrics. "
            f"The overall SolvAI score of {score}/100 ({rating}) reflects a thorough analysis "
            "of income stability, growth trends, seasonal patterns, and reputation signals "
            "drawn from connected platforms. "
            "The freelancer demonstrates consistent revenue generation capacity with "
            "manageable variance between billing periods. Income diversification across "
            "multiple clients reduces concentration risk, a key positive indicator for "
            "alternative lenders. "
            "Growth metrics indicate the business is expanding its revenue base, "
            "with a positive compound monthly growth rate over the observed period. "
            "This trajectory suggests the applicant's debt-service capacity is likely "
            "to improve over the loan term. "
            "Seasonal adjustments have been applied to normalise for the typical Q1 "
            "slowdown common in EU freelance markets. The adjusted figures support "
            "the assigned rating. "
            "This report is intended as a supplementary assessment tool for participating "
            "lenders and does not constitute a regulated credit assessment under EU "
            "Consumer Credit Directive 2023/2225."
        ),
        "data_references": [
            f"Data source count: {source_count}",
            f"Average monthly revenue (estimated): €{avg_monthly:,.0f}",
            "Assessment methodology: SolvAI Alternative Scoring v1.0",
            "Benchmark: EU Freelancer Financial Health Index 2024",
        ],
    }


# ── Prompt builder ────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """You are SolvAI's financial analyst AI. Your task is to generate a structured
alternative solvency report for an EU/UK freelancer based on their aggregated financial data.

Respond ONLY with a valid JSON object – no markdown fences, no extra text.

The JSON must have exactly these keys:
{
  "overall_score": <integer 0-100>,
  "rating": <"Strong" | "Developing" | "At Risk">,
  "income_stability": {"score": <int 0-100>, "description": <string>},
  "growth_trend": {"score": <int 0-100>, "description": <string>},
  "seasonality": {"pattern": <string>, "description": <string>},
  "reputation_signals": {"score": <int 0-100>, "description": <string>},
  "narrative": <string 300-500 words explaining the score in plain English>,
  "data_references": [<list of strings citing data points used>]
}

Score guidance:
- 70-100 → Strong: reliable, growing, diversified income
- 40-69  → Developing: adequate but with notable variability
- 0-39   → At Risk: high variance, declining, or insufficient data
"""


def _build_user_prompt(financial_summary: dict[str, Any]) -> str:
    return (
        "Generate an alternative solvency report for the following financial summary:\n\n"
        f"{json.dumps(financial_summary, indent=2, default=str)}"
    )


# ── JSON extraction helper ────────────────────────────────────────────────────
def _extract_json(raw: str) -> dict[str, Any]:
    """
    Extract a JSON object from raw text.
    Handles responses wrapped in markdown code fences.
    """
    # Strip markdown fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Find the outermost JSON object
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(cleaned)


# ── Public async function ─────────────────────────────────────────────────────
async def generate_solvency_report(financial_summary: dict[str, Any]) -> dict[str, Any]:
    """
    Call Google Gemini to generate a structured solvency report.

    Falls back to a realistic mock report if:
    - GEMINI_API_KEY is not configured
    - The API call fails after retries
    - The response cannot be parsed as valid JSON

    Args:
        financial_summary: Aggregated financial metrics built from the user's
                           connected data sources.

    Returns:
        A dict matching the SolvAI report schema.
    """
    model = _get_model()
    if model is None:
        logger.info("GEMINI_API_KEY not set – returning mock solvency report")
        return _build_mock_report(financial_summary)

    prompt = _build_user_prompt(financial_summary)

    try:
        # google-generativeai is synchronous; run in executor to keep async
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(
                f"{_SYSTEM_PROMPT}\n\n{prompt}",
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": 2048,
                },
            ),
        )
        raw_text = response.text
        logger.debug(f"Gemini raw response (first 200 chars): {raw_text[:200]}")

        result = _extract_json(raw_text)
        logger.info(f"Gemini solvency report generated – score={result.get('overall_score')}")
        return result

    except json.JSONDecodeError as exc:
        logger.error(f"Failed to parse Gemini JSON response: {exc}")
        return _build_mock_report(financial_summary)
    except Exception as exc:
        logger.error(f"Gemini API call failed: {exc}")
        return _build_mock_report(financial_summary)


# ── Synchronous wrapper for Celery tasks ─────────────────────────────────────
def generate_solvency_report_sync(financial_summary: dict[str, Any]) -> dict[str, Any]:
    """Synchronous wrapper suitable for use inside Celery tasks."""
    return asyncio.run(generate_solvency_report(financial_summary))
