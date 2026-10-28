"""SolvAI never publishes a placeholder score: AI failures surface as errors."""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import get_current_user
from app.main import app
from app.services import agent_orchestrator
from app.services.agent_orchestrator import ReportGenerationError, auditor_node, underwriter_node


class _FakeModel:
    def __init__(self, text=None, error=None):
        self.text, self.error = text, error

    def generate_content(self, *args, **kwargs):
        if self.error:
            raise self.error
        # Same shape as a google.generativeai response: candidates -> content -> parts
        part = SimpleNamespace(text=self.text)
        return SimpleNamespace(candidates=[SimpleNamespace(content=SimpleNamespace(parts=[part]), finish_reason="STOP")])

    async def generate_content_async(self, *args, **kwargs):
        return self.generate_content()


@pytest.fixture
def fake_gemini(monkeypatch):
    def install(**kwargs):
        monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
        monkeypatch.setattr("google.generativeai.configure", lambda **_: None)
        monkeypatch.setattr("google.generativeai.GenerativeModel", lambda *a, **k: _FakeModel(**kwargs))
    return install


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="user")
    yield TestClient(app)
    app.dependency_overrides.clear()


async def test_underwriter_without_api_key_fails_instead_of_mocking(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    with pytest.raises(ReportGenerationError, match="not configured"):
        await underwriter_node({"financial_summary": {}, "quant_metrics": {}})


def test_auditor_rejects_invalid_final_draft(fake_gemini):
    fake_gemini(text='{"is_approved": true, "critique": ""}')

    with pytest.raises(ReportGenerationError, match="could not produce a valid report"):
        auditor_node({"draft_report": "not json", "iterations": 2, "financial_summary": {}})


def test_auditor_accepts_valid_draft(fake_gemini):
    fake_gemini(text='{"is_approved": true, "critique": ""}')

    result = auditor_node({"draft_report": '{"overall_score": 72}', "iterations": 0, "financial_summary": {}})

    assert result["final_report"]["overall_score"] == 72
    assert "_fallback" not in result["final_report"]


def test_safe_skeleton_is_gone():
    assert not hasattr(agent_orchestrator, "SAFE_REPORT_SKELETON")


def test_old_llm_score_simulator_is_gone(client):
    assert client.post("/simulate/score", json={}).status_code == 404


def test_each_agent_uses_its_configured_model(monkeypatch, client):
    used = []

    def model_factory(*args, **kwargs):
        used.append(kwargs.get("model_name") or args[0])
        return _FakeModel(text='{"is_approved": true, "overall_score": 70}')

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "GEMINI_UNDERWRITER_MODEL", "writer-model")
    monkeypatch.setattr(settings, "GEMINI_LIGHT_MODEL", "light-model")
    monkeypatch.setattr("google.generativeai.configure", lambda **_: None)
    monkeypatch.setattr("google.generativeai.GenerativeModel", model_factory)

    auditor_node({"draft_report": '{"overall_score": 70}', "iterations": 0, "financial_summary": {}})
    assert used == ["light-model"]
