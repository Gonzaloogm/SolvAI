from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.user import User
from app.core.config import settings
import google.generativeai as genai
import json

router = APIRouter()

@router.post("/simulate/score")
async def simulate_score(
    payload: dict,
    current_user: User = Depends(get_current_user)
):
    # Setup genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash") # Use flash for <5s response

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
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean up in case there are markdown blocks
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        result_json = json.loads(text)
        return result_json
    except Exception as e:
        # Fallback if Gemini fails
        return {
            "overall_score": 60,
            "rating": "REVIEW",
            "income_stability": 50,
            "growth_trend": 50,
            "client_concentration": 50,
            "key_insight": "Score simulation failed.",
            "top_recommendation": "Please try again later."
        }
