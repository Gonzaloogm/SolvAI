import asyncio
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.api import ws_terminal
from app.core.plans import require_api_access
from app.core.security import create_access_token
from app.main import app

ORG = str(uuid.uuid4())


# ── Terminal WebSocket ────────────────────────────────────────────────────────

def test_terminal_closes_without_a_token():
    with TestClient(app) as client:
        with client.websocket_connect(f"/ws/terminal/{ORG}") as ws:
            ws.send_text("{}")
            with pytest.raises(WebSocketDisconnect) as exc:
                ws.receive_text()
    assert exc.value.code == 1008


def test_terminal_closes_for_a_user_of_another_organisation(monkeypatch):
    async def deny(token, org_id, report_id):
        return False
    monkeypatch.setattr(ws_terminal, "_authorized", deny)
    with TestClient(app) as client:
        with client.websocket_connect(f"/ws/terminal/{ORG}") as ws:
            ws.send_json({"token": "valid-but-wrong-org"})
            with pytest.raises(WebSocketDisconnect) as exc:
                ws.receive_text()
    assert exc.value.code == 1008


def test_invalid_or_refresh_tokens_are_not_authorised():
    assert asyncio.run(ws_terminal._authorized("not-a-jwt", ORG, None)) is False
    refresh = create_access_token({"sub": str(uuid.uuid4())}).replace(".", "x", 1)  # tampered
    assert asyncio.run(ws_terminal._authorized(refresh, ORG, None)) is False


# ── Business-only API access ──────────────────────────────────────────────────

class _DB:
    def __init__(self, plan):
        self.plan = plan

    async def execute(self, *_):
        return SimpleNamespace(scalar_one_or_none=lambda: self.plan)


@pytest.mark.parametrize("plan", ["free", "pro", None])
async def test_api_access_requires_business(plan):
    with pytest.raises(HTTPException) as exc:
        await require_api_access(_DB(plan), uuid.uuid4())
    assert exc.value.status_code == 403 and "Business" in exc.value.detail


async def test_business_has_api_access():
    await require_api_access(_DB("business"), uuid.uuid4())
