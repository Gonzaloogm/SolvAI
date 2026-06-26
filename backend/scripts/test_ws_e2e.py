import asyncio
import websockets
import json
import uuid
import httpx
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.solvency_report import SolvencyReport
from app.models.organization import Organization
from app.models.user import User

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).limit(1))
        user = result.scalars().first()
        result = await db.execute(select(Organization).limit(1))
        org = result.scalars().first()
        
        if not user or not org:
            print("No user/org found")
            return
            
        print(f"Using user {user.id} and org {org.id}")
        
        # 1. Trigger report generation directly hitting Celery task
        from app.tasks.report_generation import generate_solvency_report_task
        
        report = SolvencyReport(
            user_id=user.id,
            organization_id=org.id,
            status="PENDING"
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)
        print(f"Created report: {report.id}")
        
        # Start celery task in background (since we don't want to block WebSocket listening)
        # We can just call .delay()
        generate_solvency_report_task.delay(str(report.id), str(user.id))
        print("Dispatched celery task")
        
        ws_url = f"ws://localhost:8000/ws/terminal/{org.id}?report_id={report.id}"
        print(f"Connecting to {ws_url}...")
        try:
            async with websockets.connect(ws_url) as websocket:
                print("Connected!")
                while True:
                    try:
                        message = await websocket.recv()
                        data = json.loads(message)
                        print(f"EVENT: {data.get('agent')} -> {data.get('status')} | {data.get('message')}")
                        if data.get('status') in ['completed', 'error']:
                            if 'payload' in data and data['payload']:
                                print("\nFINAL PAYLOAD KEYS:", data['payload'].keys())
                                print("\nFINAL SCORE:", data['payload'].get('overall_score'))
                            break
                    except Exception as e:
                        print(f"Error receiving: {e}")
                        break
        except Exception as e:
            print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
