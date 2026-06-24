from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any
import json
import asyncio
from loguru import logger
from app.services.agent_orchestrator import run_orchestrator_stream

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
        # Dummy initial state for the stream demonstration
        initial_state = {
            "transactions": [],
            "financial_summary": {"revenue": 10000},
            "quant_metrics": {},
            "draft_report": "",
            "auditor_feedback": "",
            "is_approved": False,
            "iterations": 0,
            "final_report": {},
            "requires_human_review": False
        }
        
        try:
            async for payload in run_orchestrator_stream(initial_state):
                if client_connected.is_set():
                    try:
                        await manager.send_personal_message(payload, websocket)
                    except RuntimeError: # Catch if socket was closed mid-send
                        client_connected.clear()
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
