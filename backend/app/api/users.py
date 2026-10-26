from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update the currently authenticated user's email",
)
async def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    if body.email is not None:
        new_email = str(body.email).lower().strip()

        # Check for duplicate email
        result = await db.execute(
            select(User).where(
                User.email == new_email,
                User.id != current_user.id,
            )
        )
        if result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already in use",
            )
        current_user.email = new_email

    await db.flush()
    return UserResponse.model_validate(current_user)

@router.delete(
    "/me",
    summary="Delete the currently authenticated user (hard delete)",
    status_code=200,
)
async def delete_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # Hard delete — all child rows are removed via ON DELETE CASCADE
    # (solvency_reports, financial_data_sources, alerts, api_keys)
    # SQLAlchemy cascade="all, delete-orphan" handles the ORM side.
    await db.delete(current_user)
    await db.commit()
    return {"status": "deleted"}
