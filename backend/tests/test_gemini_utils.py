"""Gemini answers that come back in several parts must not fail a report."""
from types import SimpleNamespace as NS

import pytest

from app.utils.gemini import response_json, response_text


def _response(*parts, finish_reason="STOP"):
    return NS(candidates=[NS(content=NS(parts=list(parts)), finish_reason=finish_reason)])


def test_joins_text_parts_and_skips_thoughts():
    r = _response(NS(text="thinking...", thought=True), NS(text='{"is_approved": '), NS(text="true}"))
    assert response_text(r) == '{"is_approved": true}'
    assert response_json(r) == {"is_approved": True}


def test_json_with_fences_and_trailing_text():
    r = _response(NS(text='```json\n{"overall_score": 81}\n```\nDone.'))
    assert response_json(r) == {"overall_score": 81}


def test_empty_answer_raises_with_reason():
    with pytest.raises(ValueError, match="SAFETY"):
        response_text(_response(finish_reason="SAFETY"))
