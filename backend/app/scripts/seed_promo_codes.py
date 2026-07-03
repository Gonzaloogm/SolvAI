import asyncio
import os
import sys

# Add backend directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import engine
from sqlalchemy import text

async def seed_promo_codes():
    print("Seeding promo codes...")
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS promo_codes (
        code VARCHAR(50) PRIMARY KEY,
        discount_percent INTEGER NOT NULL,
        max_uses INTEGER,
        uses INTEGER DEFAULT 0,
        expires_at TIMESTAMP
    );
    """
    
    insert_sql = """
    INSERT INTO promo_codes (code, discount_percent, max_uses, uses, expires_at) 
    VALUES ('SOLVAI-FOUNDER', 100, 100, 0, '2025-12-31') ON CONFLICT DO NOTHING;
    """
    
    async with engine.begin() as conn:
        print("Creating table if not exists...")
        await conn.execute(text(create_table_sql))
        
        print("Inserting SOLVAI-FOUNDER promo code...")
        await conn.execute(text(insert_sql))
        
    print("Seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_promo_codes())
