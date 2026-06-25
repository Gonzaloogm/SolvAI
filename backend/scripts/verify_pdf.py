import asyncio
import uuid
import sys
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.solvency_report import SolvencyReport
from app.services.pdf_service import generate_solvency_pdf

async def main():
    report_id = "b14039da-5f09-4a64-9046-c8eed03af4c9"
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SolvencyReport).where(SolvencyReport.id == uuid.UUID(report_id))
        )
        report = result.scalars().first()
        if not report:
            print("Report not found.")
            sys.exit(1)
        
        pdf_bytes = generate_solvency_pdf(report)
        pdf_data = pdf_bytes.read()
        
        out_file = "/app/e2e_report.pdf"
        with open(out_file, "wb") as f:
            f.write(pdf_data)
        
        print(f"Generated PDF size: {len(pdf_data) / 1024:.2f} KB")

if __name__ == "__main__":
    asyncio.run(main())
