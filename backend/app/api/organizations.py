from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import OrganizationResponse, OrganizationUpdate

router = APIRouter()


async def _get_org_for_user(
    org_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> Organization:
    """Fetch an organisation by *org_id* and verify the current user belongs to it."""
    result = await db.execute(
        select(Organization).where(
            Organization.id == org_id,
            Organization.is_deleted.is_(False),
        )
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organisation not found",
        )
    if current_user.organization_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organisation",
        )
    return org


@router.get(
    "/{id}",
    response_model=OrganizationResponse,
    summary="Get an organisation by ID",
)
async def get_organization(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrganizationResponse:
    org = await _get_org_for_user(id, current_user, db)
    return OrganizationResponse.model_validate(org)


@router.patch(
    "/{id}",
    response_model=OrganizationResponse,
    summary="Update an organisation's name",
)
async def update_organization(
    id: uuid.UUID,
    body: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrganizationResponse:
    org = await _get_org_for_user(id, current_user, db)

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organisation name must not be empty",
            )
        org.name = name

    await db.flush()
    return OrganizationResponse.model_validate(org)
