"""Seed the lender manifests used by lender matching (Gemini embeddings + pgvector).

Run from backend/:  python scripts/seed_lenders.py
"""
import asyncio
import os
import sys
import google.generativeai as genai
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

# Make `app` importable when run from backend/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.models.lender_profile import LenderManifest

LENDERS = [
    {
        "name": "Lender A (Prime Bank)",
        "risk_tier": "Prime",
        "raw_criteria": {
            "Min_Revenue": "8000 EUR",
            "Max_Client_Concentration": "20%",
            "Min_History": "24 months",
            "Seasonality_Tolerance": "Zero"
        }
    },
    {
        "name": "Lender B (Alt Growth)",
        "risk_tier": "Alternative",
        "raw_criteria": {
            "Min_Revenue": "4000 EUR",
            "Max_Client_Concentration": "40%",
            "Min_History": "12 months",
            "Seasonality_Tolerance": "Moderate"
        }
    },
    {
        "name": "Lender C (Micro-Rev)",
        "risk_tier": "Micro",
        "raw_criteria": {
            "Min_Revenue": "1500 EUR",
            "Max_Client_Concentration": "85%",
            "Min_History": "6 months",
            "Seasonality_Tolerance": "High"
        }
    }
]

async def main():
    if not settings.GEMINI_API_KEY:
        print("GEMINI_API_KEY is not set")
        return

    genai.configure(api_key=settings.GEMINI_API_KEY)

    # Outside docker the compose hostname `db` is localhost
    engine = create_async_engine(settings.DATABASE_URL.replace("@db:", "@localhost:"))
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        for lender in LENDERS:
            print(f"Vectorizing {lender['name']}...")
            text_to_embed = f"Name: {lender['name']}\nRisk Tier: {lender['risk_tier']}\nCriteria: {lender['raw_criteria']}"
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text_to_embed,
                task_type="retrieval_document"
            )
            embedding = result['embedding']
            
            new_lender = LenderManifest(
                name=lender["name"],
                risk_tier=lender["risk_tier"],
                raw_criteria=lender["raw_criteria"],
                embedding=embedding
            )
            
            session.add(new_lender)
            
        await session.commit()
        print("Data Seeding Complete!")

if __name__ == "__main__":
    asyncio.run(main())
