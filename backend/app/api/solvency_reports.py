from __future__ import annotations

import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.solvency_report import SolvencyReport
from app.models.user import User
from app.schemas.solvency_report import SolvencyReportCreateRequest, SolvencyReportResponse
from app.services.stripe_service import get_raw_transactions

router = APIRouter()

@router.get(
    "/demo-transactions",
    summary="Get raw transactions for demo",
)
async def get_demo_transactions(
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    return get_raw_transactions()



@router.post(
    "/",
    response_model=SolvencyReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate a new solvency report generation",
)
async def create_solvency_report(
    body: SolvencyReportCreateRequest = SolvencyReportCreateRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SolvencyReportResponse:
    from app.models.organization import Organization
    from sqlalchemy import func
    org_res = await db.execute(select(Organization).where(Organization.id == current_user.organization_id))
    org_obj = org_res.scalar_one_or_none()
    
    # Paywall removed for demo purposes

    report_type = getattr(body, "report_type", "FULL")

    # Enforce rental certificate limits for Free plan
    if report_type == "RENTAL" and org_obj and org_obj.plan == "free":
        from sqlalchemy import func
        start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        count_res = await db.execute(
            select(func.count(SolvencyReport.id))
            .where(
                SolvencyReport.organization_id == current_user.organization_id,
                SolvencyReport.report_type == "RENTAL",
                SolvencyReport.created_at >= start_of_month,
                SolvencyReport.is_deleted.is_(False)
            )
        )
        count = count_res.scalar() or 0
        if count >= 1:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Free plan allows 1 Rental Certificate per month. Upgrade to Pro for unlimited certificates."
            )

    report = SolvencyReport(
        id=uuid.uuid4(),
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        status="PENDING",
        report_type=report_type,
    )
    db.add(report)
    await db.flush()

    report_id = str(report.id)
    user_id = str(current_user.id)

    # Dispatch background task (import here to avoid circular imports)
    from app.tasks.report_generation import generate_solvency_report_task  # noqa: PLC0415

    generate_solvency_report_task.delay(report_id, user_id)
    logger.info(f"Report {report_id} created as PENDING. Triggered Celery task.")

    return SolvencyReportResponse.model_validate(report)


@router.get(
    "/",
    response_model=list[SolvencyReportResponse],
    summary="List all solvency reports for the current organization",
)
async def list_solvency_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SolvencyReportResponse]:
    result = await db.execute(
        select(SolvencyReport)
        .where(
            SolvencyReport.organization_id == current_user.organization_id,
            SolvencyReport.is_deleted.is_(False),
        )
        .order_by(SolvencyReport.created_at.desc())
    )
    reports = result.scalars().all()
    return [SolvencyReportResponse.model_validate(r) for r in reports]

@router.post(
    "/rental",
    response_model=SolvencyReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate a new rental certificate generation",
)
async def create_rental_certificate(
    body: SolvencyReportCreateRequest = SolvencyReportCreateRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SolvencyReportResponse:
    body.report_type = "RENTAL"
    return await create_solvency_report(body, current_user, db)

@router.post(
    "/mortgage",
    response_model=SolvencyReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate a new mortgage assessment generation",
)
async def create_mortgage_assessment(
    body: SolvencyReportCreateRequest = SolvencyReportCreateRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SolvencyReportResponse:
    body.report_type = "MORTGAGE_ASSESSMENT"
    return await create_solvency_report(body, current_user, db)


# ── PDF endpoint MUST come BEFORE the /{id} catch-all ──────────────────────
@router.get(
    "/{id}/pdf",
    summary="Download a solvency report as PDF",
)
async def download_solvency_report_pdf(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import StreamingResponse
    from app.services.pdf_service import generate_solvency_pdf

    result = await db.execute(
        select(SolvencyReport).where(
            SolvencyReport.id == id,
            SolvencyReport.is_deleted.is_(False),
        )
    )
    report = result.scalar_one_or_none()

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solvency report not found",
        )
    if report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this report",
        )
    if report.status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report is not completed yet",
        )

    from app.models.organization import Organization
    org_res = await db.execute(select(Organization).where(Organization.id == current_user.organization_id))
    org_obj = org_res.scalar_one_or_none()
    
    if not report.share_token:
        report.share_enabled = True
        report.share_expires_at = datetime.now(timezone.utc) + timedelta(days=90)
        report.share_token = secrets.token_urlsafe(24)
        await db.commit()

    from app.utils.qr_generator import generate_verification_url, generate_qr_base64
    verify_url = generate_verification_url(str(report.id), report.share_token)
    qr_code_b64 = generate_qr_base64(verify_url)
    verification_id = report.share_token[-8:]

    report.qr_code_b64 = qr_code_b64
    report.verification_id = verification_id
    report.verify_url = verify_url

    # PDF paywall removed for demo purposes

    pdf_buffer = generate_solvency_pdf(report)
    org_name = org_obj.name if org_obj else "unknown-org"

    slug = re.sub(r'[^a-z0-9]+', '-', org_name.lower()).strip('-')
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    short_id = str(id)[:4]
    filename = f"solvai-report_{slug}_{date_str}_{short_id}.pdf"

    pdf_buffer.seek(0)
    
    return StreamingResponse(
        iter([pdf_buffer.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/{report_id}/share", summary="Enable public share link for a report")
async def create_share_link(
    report_id: uuid.UUID,
    body: dict = Body(default={}),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SolvencyReport).where(
            SolvencyReport.id == report_id,
            SolvencyReport.is_deleted.is_(False),
        )
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if report.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Report must be completed to share")

    expires_days = int(body.get("expires_days", 90))
    token = secrets.token_urlsafe(24)
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

    report.share_token = token
    report.share_enabled = True
    report.share_expires_at = expires_at
    await db.flush()

    from app.core.config import settings
    share_url = f"{settings.FRONTEND_URL}/r/{token}"

    return {
        "share_url": share_url,
        "token": token,
        "expires_at": expires_at.isoformat(),
        "expires_days": expires_days,
    }


@router.delete("/{report_id}/share", summary="Disable public share link")
async def delete_share_link(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SolvencyReport).where(
            SolvencyReport.id == report_id,
            SolvencyReport.is_deleted.is_(False),
        )
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    report.share_enabled = False
    report.share_token = None
    report.share_expires_at = None
    await db.flush()

    return {"message": "Share link disabled"}


@router.get(
    "/score-history",
    summary="Get score history for the last 12 months",
)
async def get_score_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Returns one score per month for the last 12 months, ordered ascending."""
    result = await db.execute(
        select(SolvencyReport)
        .where(
            SolvencyReport.organization_id == current_user.organization_id,
            SolvencyReport.is_deleted.is_(False),
            SolvencyReport.status == "COMPLETED",
            SolvencyReport.overall_score.isnot(None),
        )
        .order_by(SolvencyReport.generated_month.asc())
        .limit(12)
    )
    reports = result.scalars().all()

    # Deduplicate by month — keep the latest score per month
    month_map: dict = {}
    for r in reports:
        month = r.generated_month or (
            r.created_at.strftime('%Y-%m') if r.created_at else None
        )
        if month and (
            month not in month_map
            or r.created_at > month_map[month].created_at
        ):
            month_map[month] = r

    history = [
        {
            "month": month,
            "score": r.overall_score,
            "rating": r.rating,
        }
        for month, r in sorted(month_map.items())
    ]

    return history


@router.get(
    "/{id}",
    response_model=SolvencyReportResponse,
    summary="Get a solvency report by ID",
)
async def get_solvency_report(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SolvencyReportResponse:
    result = await db.execute(
        select(SolvencyReport).where(
            SolvencyReport.id == id,
            SolvencyReport.is_deleted.is_(False),
        )
    )
    report = result.scalar_one_or_none()

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solvency report not found",
        )
    if report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this report",
        )

    return SolvencyReportResponse.model_validate(report)
