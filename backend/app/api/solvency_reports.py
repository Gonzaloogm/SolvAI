from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.solvency_report import SolvencyReport
from app.models.user import User
from app.schemas.solvency_report import SolvencyReportCreateRequest, SolvencyReportResponse

router = APIRouter()


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
    report = SolvencyReport(
        id=uuid.uuid4(),
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        status="PENDING",
    )
    db.add(report)
    await db.flush()

    report_id = str(report.id)
    user_id = str(current_user.id)

    # Dispatch background task (import here to avoid circular imports)
    from app.tasks.report_generation import generate_solvency_report_task  # noqa: PLC0415

    generate_solvency_report_task.delay(report_id, user_id)
    logger.info(f"Dispatched report generation task for report_id={report_id}")

    return SolvencyReportResponse.model_validate(report)


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
