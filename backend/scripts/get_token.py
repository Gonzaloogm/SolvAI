import asyncio
import uuid
import sys
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.solvency_report import SolvencyReport
from app.models.user import User
from app.core.security import create_access_token
import os

async def main():
    report_id = "b14039da-5f09-4a64-9046-c8eed03af4c9"
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SolvencyReport).where(SolvencyReport.id == uuid.UUID(report_id))
        )
        report = result.scalars().first()
        
        u = await db.execute(select(User).where(User.id == report.user_id))
        user = u.scalars().first()
        
        # Generate token
        token = create_access_token({"sub": str(user.id)})
        
        print(token)

if __name__ == "__main__":
    asyncio.run(main())
