from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.schemas.admin import CreateBetaUserRequest, CreateBetaUserResponse
from app.services import auth_service
from app.models.organization import Organization

router = APIRouter()

@router.post(
    "/create-beta-user",
    response_model=CreateBetaUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Create a beta tester and upgrade to pro",
)
async def create_beta_user(
    body: CreateBetaUserRequest,
    x_admin_key: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> CreateBetaUserResponse:
    if not settings.ADMIN_KEY or x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Admin-Key",
        )

    try:
        org, user = await auth_service.register_user(
            db=db,
            email=body.email,
            password=body.password,
            org_name=f"Beta User ({body.email})",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    
    # Upgrade organization
    org.plan = body.plan
    org.status = "active"
    org.current_period_end = datetime(2099, 12, 31, 23, 59, 59)
    
    db.add(org)
    await db.commit()

    return CreateBetaUserResponse(
        email=body.email,
        password=body.password,
        plan=org.plan,
        login_url="https://solvai-frontend-879357866699.europe-west1.run.app/login"
    )
