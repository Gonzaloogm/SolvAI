from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, get_current_user
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, ChangePasswordRequest
from app.schemas.promo_code import PromoValidateRequest, PromoValidateResponse
from app.services import auth_service
from app.services.email_service import send_welcome_email_async

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user and organisation",
)
async def register(
    body: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        _org, user = await auth_service.register_user(
            db=db,
            email=body.email,
            password=body.password,
            org_name=body.organization_name,
            full_name=body.full_name,
            promo_code=body.promo_code,
        )
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    background_tasks.add_task(send_welcome_email_async, user.email, _org.plan)

    token_payload = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_payload),
        refresh_token=create_refresh_token(token_payload),
    )


@router.post(
    "/validate-promo",
    response_model=PromoValidateResponse,
    summary="Validate a promo code",
)
async def validate_promo(
    body: PromoValidateRequest,
    db: AsyncSession = Depends(get_db),
) -> PromoValidateResponse:
    from app.models.promo_code import PromoCode
    from sqlalchemy import select
    from datetime import datetime, timezone

    result = await db.execute(select(PromoCode).where(PromoCode.code == body.code))
    promo = result.scalar_one_or_none()

    if not promo:
        return PromoValidateResponse(valid=False, message="Invalid promo code")
    if not promo.is_active:
        return PromoValidateResponse(valid=False, message="Promo code is inactive")
    if promo.uses_count >= promo.max_uses:
        return PromoValidateResponse(valid=False, message="Promo code usage limit reached")
    if promo.expires_at and promo.expires_at < datetime.now(timezone.utc):
        return PromoValidateResponse(valid=False, message="Promo code has expired")

    return PromoValidateResponse(valid=True, plan=promo.plan, message="Promo code is valid")


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and obtain JWT tokens",
)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = await auth_service.authenticate_user(
        db=db,
        email=body.email,
        password=body.password,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_payload = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_payload),
        refresh_token=create_refresh_token(token_payload),
    )


@router.post(
    "/refresh-token",
    response_model=TokenResponse,
    summary="Exchange a refresh token for a new token pair",
)
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    from app.models.user import User  # noqa: PLC0415
    from sqlalchemy import select  # noqa: PLC0415

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            body.refresh_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("token_type")
        if user_id is None or token_type != "refresh":
            raise credentials_exception
    except JWTError as exc:
        logger.debug(f"Refresh token decode error: {exc}")
        raise credentials_exception from exc

    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted.is_(False))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    token_payload = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_payload),
        refresh_token=create_refresh_token(token_payload),
    )


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change user password",
)
async def change_password(
    body: ChangePasswordRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await auth_service.change_password(
            db=db,
            user=current_user,
            current_password=body.current_password,
            new_password=body.new_password,
        )
        await db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    
    return {"detail": "Password changed successfully"}

@router.get(
    "/me",
    summary="Get current user",
)
async def get_me(current_user = Depends(get_current_user)):
    return current_user

@router.post(
    "/admin/reset-demo-password",
    summary="Temporary endpoint to reset demo password",
)
async def reset_demo_password(db: AsyncSession = Depends(get_db)):
    from app.models.user import User
    from app.core.security import get_password_hash
    from sqlalchemy import select

    result = await db.execute(select(User).where(User.email == "demo@solvai.com"))
    user = result.scalar_one_or_none()
    if not user:
        return {"detail": "Demo user not found"}
    user.hashed_password = get_password_hash("Demo2026!")
    await db.commit()
    return {"detail": "Password reset to Demo2026!"}
