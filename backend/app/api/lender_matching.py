from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.solvency_report import SolvencyReport
from app.models.user import User
from app.schemas.lender import LenderMatch, LenderMatchingResponse
from app.services.lender_service import get_lender_matches

router = APIRouter()


@router.get(
    "/{report_id}",
    response_model=LenderMatchingResponse,
    summary="Get lender matches for a completed solvency report",
)
async def lender_matching(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LenderMatchingResponse:
    result = await db.execute(
        select(SolvencyReport).where(
            SolvencyReport.id == report_id,
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
            detail=(
                f"Lender matching is only available for COMPLETED reports. "
                f"Current status: {report.status}"
            ),
        )

    overall_score: int = (report.report_data or {}).get("overall_score", 0)
    raw_matches = get_lender_matches(overall_score)

    matches = [LenderMatch(**m) for m in raw_matches]

    return LenderMatchingResponse(
        report_id=report_id,
        score=overall_score,
        matches=matches,
    )
