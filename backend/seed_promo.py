import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.models.promo_code import PromoCode

async def seed_promo_codes():
    codes = [
        {"code": "SOLVAI-FOUNDER", "plan": "pro", "max_uses": 100},
        {"code": "HACKATHON2026", "plan": "pro", "max_uses": 50},
        {"code": "BETA-ACCESS", "plan": "pro", "max_uses": 25},
        {"code": "LANDLORD-PRO", "plan": "pro", "max_uses": 20},
        {"code": "GESTOR-PRO", "plan": "pro", "max_uses": 20},
    ]
    
    async with AsyncSessionLocal() as db:
        for data in codes:
            result = await db.execute(select(PromoCode).filter(PromoCode.code == data["code"]))
            existing = result.scalars().first()
            if not existing:
                promo = PromoCode(**data)
                db.add(promo)
        
        try:
            await db.commit()
            print("Successfully seeded promo codes.")
        except Exception as e:
            await db.rollback()
            print(f"Error seeding codes: {e}")

if __name__ == "__main__":
    asyncio.run(seed_promo_codes())
