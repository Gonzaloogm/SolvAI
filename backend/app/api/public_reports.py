from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.solvency_report import SolvencyReport

router = APIRouter()


def _sanitize_report_data(report: SolvencyReport) -> dict:
    """Return a privacy-safe version of report data — no amounts, no client names."""
    rd = report.report_data or {}

    # Extract component scores only (no descriptions with amounts)
    # None (not assessed) rather than 0, which would read as the worst possible score
    def safe_score(component):
        if isinstance(component, dict) and isinstance(component.get("score"), (int, float)):
            return component["score"]
        return None

    components = {
        "income_stability": safe_score(rd.get("income_stability")),
        "growth_trend": safe_score(rd.get("growth_trend")),
        "seasonality": safe_score(rd.get("seasonality")),
        "client_concentration": safe_score(rd.get("client_concentration")),
        "reputation_signals": safe_score(rd.get("reputation_signals")),
    }

    overall_score = rd.get("overall_score") or 0
    rating = rd.get("rating") or "N/A"

    # Determine risk level
    try:
        score_int = int(overall_score)
    except (ValueError, TypeError):
        score_int = 0

    if score_int >= 70:
        risk_level = "LOW"
    elif score_int >= 50:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # Get data sources (just types, not credentials)
    financial_summary = rd.get("financial_summary", {})
    data_sources = financial_summary.get("connected_platforms", ["STRIPE"])
    if not isinstance(data_sources, list):
        data_sources = ["STRIPE"]

    token = report.share_token or ""
    verification_id = token[-8:] if len(token) >= 8 else token

    return {
        "overall_score": overall_score,
        "rating": str(rating).upper(),
        "generated_on": report.created_at.isoformat() if report.created_at else None,
        "valid_until": report.share_expires_at.isoformat() if report.share_expires_at else None,
        "verified_by": "SolvAI AI Engine",
        "data_sources": data_sources,
        "components": components,
        "risk_level": risk_level,
        "verification_id": verification_id,
    }


@router.get("/public/report/{token}", summary="Get public report by share token")
async def get_public_report(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """No authentication required. Returns a privacy-safe report summary."""
    result = await db.execute(
        select(SolvencyReport).where(
            SolvencyReport.share_token == token,
            SolvencyReport.share_enabled.is_(True),
            SolvencyReport.is_deleted.is_(False),
        )
    )
    report = result.scalar_one_or_none()

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found or link has been disabled",
        )

    # Check expiry
    if report.share_expires_at:
        if datetime.now(timezone.utc) > report.share_expires_at:
            raise HTTPException(status_code=410, detail="This share link has expired")

    return _sanitize_report_data(report)


@router.get("/public/report/{token}/pdf", summary="Download public report PDF")
async def get_public_report_pdf(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """No authentication required. Returns simplified PDF."""
    result = await db.execute(
        select(SolvencyReport).where(
            SolvencyReport.share_token == token,
            SolvencyReport.share_enabled.is_(True),
            SolvencyReport.is_deleted.is_(False),
        )
    )
    report = result.scalar_one_or_none()

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found or link has been disabled",
        )

    if report.share_expires_at and datetime.now(timezone.utc) > report.share_expires_at:
        raise HTTPException(status_code=410, detail="This share link has expired")

    from app.services.pdf_service import generate_solvency_pdf

    pdf_buffer = generate_solvency_pdf(report)
    pdf_buffer.seek(0)

    return StreamingResponse(
        iter([pdf_buffer.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="solvai-verified-report.pdf"'},
    )
