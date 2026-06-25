import asyncio
import uuid
import json
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.solvency_report import SolvencyReport

async def main():
    report_id = "e810dbad-1ac9-4315-a1db-1dc26e86abb1"
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SolvencyReport).where(SolvencyReport.id == uuid.UUID(report_id))
        )
        report = result.scalars().first()
        
        rd = report.report_data or {}
        print("REPORT DATA:")
        print(json.dumps(rd, indent=2))
        
        raw_score = rd.get('overall_score', 0)
        try:
            overall_score = int(raw_score)
        except:
            overall_score = 50
        print(f"EXTRACTED overall_score: {overall_score}")

if __name__ == "__main__":
    asyncio.run(main())
