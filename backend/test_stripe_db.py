import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from app.core.config import settings
import json

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async with AsyncSession(engine) as session:
        result = await session.execute(text("SELECT id, connection_details FROM financial_data_sources WHERE type='STRIPE' ORDER BY created_at DESC LIMIT 1"))
        row = result.fetchone()
        if row:
            print("ID:", row[0])
            print("Connection details:", row[1])
            if "encrypted_data" in row[1]:
                enc = row[1]["encrypted_data"]
                print("Encrypted data:", enc)
                from app.core.security import decrypt_dict
                dec = decrypt_dict(enc)
                print("Decrypted:", dec)

asyncio.run(main())
