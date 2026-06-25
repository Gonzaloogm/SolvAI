from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any
import json
import asyncio
import uuid
from datetime import datetime, timezone
from loguru import logger
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.solvency_report import SolvencyReport
from app.models.financial_data_source import FinancialDataSource
from app.services.agent_orchestrator import run_orchestrator_stream
from app.tasks.report_generation import _build_financial_summary

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, org_id: str):
        await websocket.accept()
        self.active_connections[org_id] = websocket
        logger.info(f"WebSocket connected for org: {org_id}")

    def disconnect(self, websocket: WebSocket, org_id: str):
        if org_id in self.active_connections:
            del self.active_connections[org_id]
        logger.info(f"WebSocket disconnected for org: {org_id}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

manager = ConnectionManager()

@router.websocket("/{org_id}")
async def websocket_terminal(websocket: WebSocket, org_id: str):
    await manager.connect(websocket, org_id)
    
    # We create an asyncio Event to allow the background task to know when to stop 
    # attempting to send over the websocket, but continue graph execution.
    client_connected = asyncio.Event()
    client_connected.set()
    
    async def run_and_stream():
        # Create a dedicated DB session for the background task
        async with AsyncSessionLocal() as db:
            try:
                # 1. Fetch the latest pending/generating report for this org
                result = await db.execute(
                    select(SolvencyReport)
                    .where(
                        SolvencyReport.organization_id == uuid.UUID(org_id),
                        SolvencyReport.status.in_(["PENDING", "GENERATING"]),
                        SolvencyReport.is_deleted.is_(False)
                    )
                    .order_by(SolvencyReport.created_at.desc())
                )
                report = result.scalars().first()
                
                if not report:
                    logger.warning(f"No PENDING/GENERATING report found for org {org_id}")
                    if client_connected.is_set():
                        await manager.send_personal_message({
                            "agent": "system",
                            "status": "error",
                            "message": "No pending report found for this organization.",
                            "payload": {}
                        }, websocket)
                    return
                
                # Update status to GENERATING if it was PENDING
                if report.status == "PENDING":
                    report.status = "GENERATING"
                    report.updated_at = datetime.now(timezone.utc)
                    await db.commit()
                    
                # 2. Fetch connected data sources
                sources_result = await db.execute(
                    select(FinancialDataSource).where(
                        FinancialDataSource.user_id == report.user_id,
                        FinancialDataSource.is_deleted.is_(False),
                        FinancialDataSource.status == "CONNECTED",
                    )
                )
                sources = sources_result.scalars().all()
                
                # 3. Build financial summary (run in threadpool since it's synchronous)
                financial_summary = await asyncio.to_thread(_build_financial_summary, sources)
                
                # 4. Set initial state for orchestrator
                initial_state = {
                    "transactions": [],
                    "financial_summary": financial_summary,
                    "quant_metrics": {},
                    "draft_report": "",
                    "auditor_feedback": "",
                    "is_approved": False,
                    "iterations": 0,
                    "final_report": {},
                    "requires_human_review": False
                }
                
                # 5. Stream from orchestrator
                final_report_data = None
                async for payload in run_orchestrator_stream(initial_state):
                    if payload.get("status") == "completed":
                        final_report_data = payload.get("payload", {}).get("final_report", {})
                        
                    if client_connected.is_set():
                        try:
                            await manager.send_personal_message(payload, websocket)
                        except RuntimeError: # Catch if socket was closed mid-send
                            client_connected.clear()
                            
                # 6. Save final report to DB
                if final_report_data:
                    report.status = "COMPLETED"
                    report.report_data = final_report_data
                    report.generated_at = datetime.now(timezone.utc)
                    report.updated_at = datetime.now(timezone.utc)
                    await db.commit()
                    logger.info(f"Saved COMPLETED report {report.id} to DB via WS orchestrator")

            except Exception as e:
                logger.error(f"Error in orchestrator background task: {e}")
                if client_connected.is_set():
                    try:
                        await manager.send_personal_message({
                            "agent": "system",
                            "status": "error",
                            "message": str(e),
                            "payload": {}
                        }, websocket)
                    except:
                        pass
                # Optional: mark report as FAILED if we have a report object
                try:
                    if 'report' in locals() and report:
                        report.status = "FAILED"
                        report.report_data = {"error": str(e)}
                        report.updated_at = datetime.now(timezone.utc)
                        await db.commit()
                except Exception as inner_e:
                    logger.error(f"Failed to mark report as FAILED: {inner_e}")

    # Run the orchestrator in a background task so it can finish if the user disconnects
    orchestrator_task = asyncio.create_task(run_and_stream())

    try:
        while True:
            # Keep connection open and listen for client messages if necessary
            data = await websocket.receive_text()
            # We just ignore client messages for now
    except WebSocketDisconnect:
        logger.info(f"Client disconnected abruptly for org: {org_id}")
        client_connected.clear()
        manager.disconnect(websocket, org_id)
        # We do NOT cancel orchestrator_task, allowing it to finish in the background

