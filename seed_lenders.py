import asyncio
import os
import sys
import uuid
import google.generativeai as genai
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from dotenv import load_dotenv

# Add backend to path so we can import the app models
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
load_dotenv(os.path.join(os.path.dirname(__file__), "backend/.env"))

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
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found in backend/.env")
        return
        
    genai.configure(api_key=api_key)
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found. Using default localhost url.")
        db_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/solvai"
    else:
        # We are running outside docker, so target localhost
        db_url = db_url.replace("@db:", "@localhost:")
        
    print(f"Connecting to {db_url}")
    engine = create_async_engine(db_url)
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
