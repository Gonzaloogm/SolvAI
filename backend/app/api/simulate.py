
import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from app.utils.gemini import response_json

router = APIRouter()


@router.post("/simulate/score")
async def simulate_score(
    payload: dict,
    current_user: User = Depends(get_current_user)
):
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_LIGHT_MODEL)

    # Extract input
    monthly_revenue = payload.get("monthly_revenue", 3500)
    revenue_consistency = payload.get("revenue_consistency", "medium")
    num_clients = payload.get("num_clients", 1)
    months_history = payload.get("months_history", 12)
    top_client_pct = payload.get("top_client_pct", 30.0)

    prompt = f"""
    You are SolvAI's scoring engine. Given these
    financial parameters, calculate a solvency score.

    Parameters:
    - Monthly revenue: €{monthly_revenue}
    - Revenue consistency: {revenue_consistency}
    - Number of clients: {num_clients}
    - Months of history: {months_history}
    - Top client revenue share: {top_client_pct}%

    Return ONLY valid JSON, no other text:
    {{
      "overall_score": <0-100 integer>,
      "rating": "<APPROVE|REVIEW|DECLINE>",
      "income_stability": <0-100 integer>,
      "growth_trend": <0-100 integer>,
      "client_concentration": <0-100 integer>,
      "key_insight": "<one sentence explaining the main factor driving this score>",
      "top_recommendation": "<one actionable tip to improve the score>"
    }}
    """

    try:
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        result = response_json(response)
        if not isinstance(result.get("overall_score"), (int, float)):
            raise ValueError(f"overall_score missing or non-numeric: {result.get('overall_score')!r}")
        return result
    except Exception as e:
        # Never return a made-up score: surface the failure to the UI
        logger.error(f"Score simulation failed: {e}")
        raise HTTPException(
            status_code=502,
            detail="The AI scoring engine is unavailable right now. Please try again in a moment.",
        )
