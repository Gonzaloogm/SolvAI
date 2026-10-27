from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import json
import asyncio
from loguru import logger


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

AUTH_TIMEOUT_SECONDS = 10


async def _authorized(token: str, org_id: str, report_id: str | None) -> bool:
    """The token's user must belong to org_id, and the report (if any) to that organisation."""
    import uuid

    from jose import JWTError, jwt
    from sqlalchemy import select

    from app.core.config import settings
    from app.core.database import AsyncSessionLocal
    from app.models.solvency_report import SolvencyReport
    from app.models.user import User

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("token_type") != "access":
            return False
        user_id, org_uuid = uuid.UUID(payload["sub"]), uuid.UUID(org_id)
        report_uuid = uuid.UUID(report_id) if report_id else None
    except (JWTError, KeyError, ValueError):
        return False

    async with AsyncSessionLocal() as db:
        user = (await db.execute(
            select(User).where(User.id == user_id, User.is_deleted.is_(False))
        )).scalar_one_or_none()
        if user is None or user.organization_id != org_uuid:
            return False
        if report_uuid:
            report = (await db.execute(
                select(SolvencyReport).where(SolvencyReport.id == report_uuid)
            )).scalar_one_or_none()
            if report is None or report.organization_id != org_uuid:
                return False
    return True


@router.websocket("/{org_id}")
async def websocket_terminal(websocket: WebSocket, org_id: str, report_id: str | None = None):
    await manager.connect(websocket, org_id)

    # First message must carry the access token (kept out of the URL and access logs)
    try:
        first = json.loads(await asyncio.wait_for(websocket.receive_text(), AUTH_TIMEOUT_SECONDS))
        token = first.get("token") if isinstance(first, dict) else None
    except (asyncio.TimeoutError, json.JSONDecodeError, WebSocketDisconnect):
        token = None
    if not token or not await _authorized(token, org_id, report_id):
        logger.warning(f"Rejected unauthorised terminal connection for org {org_id}")
        manager.disconnect(websocket, org_id)
        await websocket.close(code=1008)
        return
    
    # We create an asyncio Event to allow the background task to know when to stop 
    # attempting to send over the websocket, but continue graph execution.
    client_connected = asyncio.Event()
    client_connected.set()
    
    async def run_and_stream():
        import redis.asyncio as aioredis
        redis_client = None
        pubsub = None
        
        try:
            from app.core.config import settings
            redis_client = await aioredis.from_url(settings.REDIS_URL)
            pubsub = redis_client.pubsub()
            
            # Subscribing to the telemetry channel for this report
            channel = f"solvai:telemetry:{report_id}" if report_id else f"solvai:telemetry:org:{org_id}"
            await pubsub.subscribe(channel)
            logger.info(f"Subscribed to Redis channel: {channel}")
            
            async for message in pubsub.listen():
                if not client_connected.is_set():
                    break
                    
                if message['type'] == 'message':
                    data = message['data'].decode('utf-8')
                    try:
                        payload = json.loads(data)
                        await manager.send_personal_message(payload, websocket)
                        
                        # Stop listening if completed or error
                        if payload.get("status") in ("completed", "error"):
                            break
                    except json.JSONDecodeError:
                        pass
                    except RuntimeError:
                        # WebSocket closed
                        client_connected.clear()
                        break
                        
        except Exception as e:
            logger.error(f"Error in Redis subscriber task: {e}")
            if client_connected.is_set():
                try:
                    await manager.send_personal_message({
                        "agent": "system",
                        "status": "error",
                        "message": "Lost connection to orchestration telemetry.",
                        "payload": {}
                    }, websocket)
                except:
                    pass
        finally:
            if pubsub:
                await pubsub.unsubscribe()
                await pubsub.close()
            if redis_client:
                await redis_client.close()

    # Run the subscriber in a background task
    subscriber_task = asyncio.create_task(run_and_stream())

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

