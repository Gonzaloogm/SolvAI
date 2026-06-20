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
    """Lazily initialize the Gemini model to allow for missing API key in dev mode."""
    global _gemini_model
    if _gemini_model is None and settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai  # noqa: PLC0415
            genai.configure(api_key=settings.GEMINI_API_KEY)
            _gemini_model = genai.GenerativeModel("gemini-2.5-flash")
            logger.info("Gemini model initialised (gemini-2.5-flash)")
        except Exception as exc:
            logger.warning(f"Could not initialise Gemini model: {exc}")
    return _gemini_model


# ── Mock report (returned when Gemini is unavailable) ────────────────────────
# Removed mock report generator


# ── Prompt builder ────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """You are SolvAI's financial analyst AI. Your task is to generate a structured
alternative solvency report for an EU/UK freelancer based on their aggregated financial data.

IMPORTANT: The financial_summary you receive contains pre-computed, verified facts
(data_source_count, avg_monthly_revenue, platform_breakdown, monthly_revenue_series,
computed_growth_trend, computed_seasonality_signal, client_concentration, etc.). Use these values
directly in your narrative and data_references — do NOT re-estimate or override them.
The avg_monthly_revenue and monthly_revenue_series are computed directly from real transaction data.
For growth_trend, seasonality, and client_concentration, USE the pre-computed signals provided
in the payload to inform your scores and descriptions. Do not claim data is insufficient.

Respond ONLY with a valid JSON object – no markdown fences, no extra text.

The JSON must have exactly these keys:
{
  "overall_score": <integer 0-100>,
  "rating": <"Strong" | "Developing" | "At Risk">,
  "income_stability": {"score": <int 0-100>, "description": <string>, "lender_implications": <string 2-3 sentences explaining what this score means practically for a lender>},
  "growth_trend": {"score": <int 0-100>, "description": <string>, "lender_implications": <string 2-3 sentences explaining what this score means practically for a lender>},
  "seasonality": {"score": <int 0-100>, "pattern": <string>, "description": <string>, "lender_implications": <string 2-3 sentences explaining what this score means practically for a lender>},
  "client_concentration": {"score": <int 0-100>, "description": <string>, "lender_implications": <string 2-3 sentences explaining what this score means practically for a lender, e.g. what to ask for if risk is high>},
  "reputation_signals": {"score": <int 0-100>, "description": <string>, "lender_implications": <string 2-3 sentences explaining what this score means practically for a lender>},
  "narrative": <string 300-500 words explaining the score in plain English, citing real concentration numbers if available>,
  "risk_flags": [<list of strings. YOU MUST populate this if ANY component score is < 60, or if top client concentration > 40%, or top 3 > 70%. Explicitly quote the exact numbers and percentages from the data in your flags.>],
  "recommendations": [<list of strings. YOU MUST provide 2-3 concrete next steps tied directly to the actual numbers from the risk flags (e.g., 'reduce top client dependency below 40%', 'build cash reserve to smooth months below X EUR').>],
  "data_references": [<list of strings citing the exact data points from the financial_summary, including monthly breakdown>]
}

Score guidance:
- 70-100 → Strong: reliable, growing, diversified income
- 40-69  → Developing: adequate but with notable variability
- 0-39   → At Risk: high variance, declining, high concentration, or insufficient data

Weighting Rules:
- The overall_score should be primarily driven by Income Stability (40%) and Growth Trend (30%).
- Client Concentration should act as a modifier (max penalty -15 points), it should not single-handedly drop a Strong score to At Risk unless revenue is extremely unstable.
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
    # Since we set response_mime_type='application/json', it should be pure JSON
    # Strip markdown fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Strip trailing backticks
    cleaned = re.sub(r"```", "", cleaned).strip()
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
        logger.error("GEMINI_API_KEY not set")
        raise RuntimeError("GEMINI_API_KEY is not configured or model failed to initialize.")

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
                    "max_output_tokens": 8192,
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
        raise RuntimeError(f"Failed to parse Gemini response: {exc}")
    except Exception as exc:
        logger.error(f"Gemini API call failed: {exc}")
        if "429" in str(exc):
            raise RuntimeError("AI analysis temporarily unavailable, please try again later")
        raise RuntimeError(f"Gemini API call failed: {exc}")
# ── Synchronous wrapper for Celery tasks ─────────────────────────────────────
def generate_solvency_report_sync(financial_summary: dict[str, Any]) -> dict[str, Any]:
    """Synchronous wrapper suitable for use inside Celery tasks."""
    return asyncio.run(generate_solvency_report(financial_summary))
