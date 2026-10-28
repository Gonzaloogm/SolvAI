"""Reading Gemini responses robustly.

`response.text` raises when a response comes back in several parts (thinking
models do this now and then), which used to fail a whole report.
"""
from __future__ import annotations

import json
from typing import Any


def response_text(response: Any) -> str:
    """Concatenate the answer's text parts, skipping thought parts."""
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        raise ValueError("Gemini returned no candidates")
    content = getattr(candidates[0], "content", None)
    parts = getattr(content, "parts", None) or []
    text = "".join(p.text for p in parts if getattr(p, "text", None) and not getattr(p, "thought", False))
    if not text.strip():
        reason = getattr(candidates[0], "finish_reason", "unknown")
        raise ValueError(f"Gemini returned no text (finish reason: {reason})")
    return text


def response_json(response: Any) -> dict:
    """The first JSON object in the answer, tolerating code fences or text around it."""
    text = response_text(response).replace("```json", "").replace("```", "").strip()
    start = text.find("{")
    if start < 0:
        raise ValueError(f"No JSON object in Gemini response: {text[:200]!r}")
    obj, _ = json.JSONDecoder().raw_decode(text[start:])
    if not isinstance(obj, dict):
        raise ValueError("Gemini response is not a JSON object")
    return obj
