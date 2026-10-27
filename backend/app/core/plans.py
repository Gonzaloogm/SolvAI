"""What each plan unlocks, enforced server-side."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

API_ACCESS_PLANS = ("business",)


async def require_api_access(db: AsyncSession, organization_id: uuid.UUID) -> None:
    """API keys and the public /v1 API are part of the Business plan."""
    from app.models.organization import Organization  # noqa: PLC0415

    plan = (await db.execute(
        select(Organization.plan).where(Organization.id == organization_id)
    )).scalar_one_or_none()
    if plan not in API_ACCESS_PLANS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API access is part of the Business plan.",
        )
