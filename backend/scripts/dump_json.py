import asyncio
import uuid
import json
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.solvency_report import SolvencyReport

async def main():
    report_id = "6e2d6ff6-d1b0-4f81-a94a-5f1b7bdfb652"
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SolvencyReport).where(SolvencyReport.id == uuid.UUID(report_id))
        )
        report = result.scalars().first()
        
        rd = report.report_data
        print(json.dumps(rd, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
