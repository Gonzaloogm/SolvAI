from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.user import User
import asyncio
import random

router = APIRouter()

@router.post("/simulate")
async def simulate_score(
    payload: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Lightweight endpoint to simulate score changes using a mock response or quick Gemini call.
    For hackathon, we use a fast mock to guarantee <3 seconds response.
    """
    await asyncio.sleep(2)  # Simulate fast processing delay
    
    # Extract input
    revenue = payload.get("revenue", 10000)
    consistency = payload.get("consistency", 50)
    concentration = payload.get("concentration", 50)
    months = payload.get("months", 12)
    
    # Basic logic for simulation
    base_score = 45
    projected = base_score + (revenue / 5000) + (consistency / 5) - (concentration / 10) + (months / 2)
    projected = min(100, max(0, int(projected)))
    delta = projected - base_score
    
    return {
        "current_score": base_score,
        "projected_score": projected,
        "delta": delta,
        "key_factors": [
            f"Increased revenue to €{revenue}/mo improves capacity.",
            f"Revenue consistency of {consistency}% stabilizes cash flow.",
            f"Client concentration at {concentration}% represents moderate risk.",
            f"{months} months of history provides sufficient data depth."
        ]
    }
