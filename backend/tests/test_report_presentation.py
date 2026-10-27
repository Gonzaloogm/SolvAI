"""What lenders see (PDF and public link) never invents a factor score."""
import datetime
import io
import uuid
from types import SimpleNamespace

import pdfplumber

from app.api.public_reports import _sanitize_report_data
from app.services.pdf_service import generate_solvency_pdf

FACTORS = {
    "income_stability": {"score": 82, "description": "Stable.", "lender_implications": "Good."},
    "growth_trend": {"score": 70, "description": "Flat.", "lender_implications": "Neutral."},
    "seasonality": {"score": 75, "description": "Mild.", "lender_implications": "Fine."},
    "client_concentration": {"score": 85, "description": "Diverse.", "lender_implications": "Low risk."},
}


def _report(**extra):
    data = {"overall_score": 77, "rating": "Strong", "narrative": "Test narrative.", **FACTORS, **extra}
    return SimpleNamespace(id=uuid.uuid4(), report_data=data, report_type="FULL", created_at=datetime.datetime(2026, 10, 26),
                           share_token="abcdefghijkl", share_expires_at=None, overall_score=77, status="COMPLETED")


def _pdf_text(report):
    with pdfplumber.open(io.BytesIO(generate_solvency_pdf(report).getvalue())) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def test_unassessed_payment_integrity_is_shown_as_not_assessed():
    text = _pdf_text(_report(reputation_signals={"score": None, "description": "No refund data.", "lender_implications": ""}))

    assert "Payment Integrity" in text and "Not assessed" in text
    assert "No adverse signals" not in text and "Normal operations" not in text


def test_assessed_payment_integrity_uses_the_report_score():
    text = _pdf_text(_report(reputation_signals={"score": 91, "description": "1 of 105 payments refunded.", "lender_implications": "Clean."}))

    assert "91 / 100" in text and "1 of 105 payments refunded." in text


def test_public_link_does_not_turn_missing_scores_into_zero():
    public = _sanitize_report_data(_report())

    assert public["components"]["reputation_signals"] is None
    assert public["components"]["income_stability"] == 82


def test_cover_shows_the_applicant_organisation():
    text = _pdf_text(_report(organization_name="Demo Studio"))

    assert "Demo Studio" in text and "Prepared by:" in text
    assert "SolvAI Assessment Partner" not in text and "Confidential\n" not in text


def test_cover_without_stored_organisation_says_so():
    assert "Not specified" in _pdf_text(_report())
