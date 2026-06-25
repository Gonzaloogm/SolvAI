import asyncio
import uuid
import json
from datetime import datetime, timezone
import random

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.solvency_report import SolvencyReport
from app.models.organization import Organization
from app.models.user import User
from app.services.agent_orchestrator import run_orchestrator_stream

async def run_massive_e2e_test():
    async with AsyncSessionLocal() as db:
        # Get any user and org
        result = await db.execute(select(User).limit(1))
        user = result.scalars().first()
        result = await db.execute(select(Organization).limit(1))
        org = result.scalars().first()
        
        if not user or not org:
            print("No user or org found in DB. Please register one first.")
            return

        # Create a new PENDING report
        report = SolvencyReport(
            user_id=user.id,
            organization_id=org.id,
            status="PENDING"
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        print(f"Created PENDING report: {report.id}")

        # Construct Massive Financial Dictionary
        # 2 years = 24 months
        months = [
            "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12",
            "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
            "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
            "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"
        ]
        
        monthly_series = []
        for m in months:
            # Q4 high, Q1 low
            if "-10" in m or "-11" in m or "-12" in m:
                total = random.uniform(20000, 30000)
            elif "-01" in m or "-02" in m or "-03" in m:
                total = random.uniform(5000, 8000)
            else:
                total = random.uniform(10000, 15000)
                
            monthly_series.append({
                "month": m,
                "total": round(total, 2),
                "transaction_count": random.randint(20, 50)
            })

        massive_summary = {
            "currency": "EUR",
            "data_source_count": 2,
            "connected_platforms": ["STRIPE", "BANK_API"],
            "analysis_period_months": 24,
            "monthly_revenue_series": monthly_series,
            "avg_monthly_revenue": 14500.0,
            "operating_expenses_breakdown": {
                "SaaS_and_Software": 1200.50,
                "Payroll_and_Contractors": 4500.00,
                "Marketing_and_Ads": 2300.00,
                "Office_and_Admin": 400.00,
                "Legal_and_Accounting": 300.00
            },
            "client_concentration": {
                "distinct_clients": 45,
                "top_client_percent": 15.0,
                "top_5_clients_percent": 40.0,
                "retention_rate": "85% YoY retention of top 5 clients"
            },
            "dispute_history": {
                "total_transactions": 850,
                "disputed_transactions": 2,
                "dispute_rate": "0.23%",
                "status": "Excellent - Extremely low dispute rate indicates high service quality."
            },
            "platform_breakdown": {
                "STRIPE": {
                    "status": "CONNECTED",
                    "avg_monthly": 14500.0,
                    "data_points": 850,
                    "recent_transactions": [
                        {"id": f"txn_{i}", "date": "2026-06-20", "amount_eur": random.uniform(500, 3000), "description": f"Invoice #{i}"}
                        for i in range(1, 51)
                    ]
                }
            }
        }

        initial_state = {
            "transactions": [],
            "financial_summary": massive_summary,
            "quant_metrics": {},
            "draft_report": "",
            "auditor_feedback": "",
            "is_approved": False,
            "iterations": 0,
            "final_report": {},
            "requires_human_review": False
        }

        print("Starting LangGraph Orchestrator stream...")
        final_report_data = None
        
        async for payload in run_orchestrator_stream(initial_state):
            print(f"Agent: {payload.get('agent')} -> {payload.get('status')} | {payload.get('message')}")
            if payload.get("status") == "completed":
                final_report_data = payload.get("payload", {}).get("final_report", {})

        if final_report_data:
            report.status = "COMPLETED"
            report.report_data = final_report_data
            report.generated_at = datetime.now(timezone.utc)
            report.updated_at = datetime.now(timezone.utc)
            await db.commit()
            print(f"\nReport {report.id} marked as COMPLETED.")
            
            # Print Size
            report_json = json.dumps(final_report_data, indent=2)
            lines = len(report_json.split('\n'))
            kb_size = len(report_json.encode('utf-8')) / 1024
            
            print(f"Size of report_data: {lines} lines / {kb_size:.2f} KB")
        else:
            print("Failed to generate final report.")

if __name__ == "__main__":
    asyncio.run(run_massive_e2e_test())
