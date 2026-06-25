import asyncio
import uuid
import sys
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.solvency_report import SolvencyReport
from app.api.solvency_reports import download_solvency_report_pdf

class MockUser:
    id = uuid.uuid4()
    organization_id = uuid.uuid4()

async def main():
    report_id = "6e2d6ff6-d1b0-4f81-a94a-5f1b7bdfb652"
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SolvencyReport).where(SolvencyReport.id == uuid.UUID(report_id))
        )
        report = result.scalars().first()
        if not report:
            print("Report not found.")
            sys.exit(1)
        
        # Override user_id just to pass auth
        mock_user = MockUser()
        report.user_id = mock_user.id
        
        try:
            response = await download_solvency_report_pdf(
                id=uuid.UUID(report_id),
                db=db,
                current_user=mock_user
            )
            print(f"Success! Response headers: {response.headers}")
            with open("test_report.pdf", "wb") as f:
                f.write(response.body)
            print(f"Downloaded {len(response.body)} bytes")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
