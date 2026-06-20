import os
import sys
import uuid
import asyncio

from app.models.solvency_report import SolvencyReport
from app.services.pdf_service import generate_solvency_pdf

async def main():
    report_data = {
        "overall_score": 85,
        "narrative": "The business shows a strong solvency profile, with consistent and growing monthly revenues.",
        "client_concentration": {
            "score": 80,
            "description": "Well diversified across 8 clients, with the top client comprising 19% of revenue."
        },
        "income_stability": {"score": 85, "description": "Highly stable income stream"},
        "growth_trend": {"score": 90, "description": "Strong month-over-month growth"},
        "seasonality": {"score": 70, "description": "Minor seasonality detected in Q4"}
    }
    
    report = SolvencyReport(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        status="COMPLETED",
        report_data=report_data
    )
    
    pdf_buffer = generate_solvency_pdf(report)
    output_path = "/Users/alumnoad/.gemini/antigravity/brain/9c7ae8dd-8166-4e0b-a0d7-8b7791f554b0/scratch/sample_report.pdf"
    
    with open(output_path, "wb") as f:
        f.write(pdf_buffer.getbuffer())
        
    print(f"PDF successfully generated at {output_path}")

if __name__ == "__main__":
    asyncio.run(main())
