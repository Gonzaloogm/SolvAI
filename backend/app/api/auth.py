from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, get_current_user
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, ChangePasswordRequest
from app.services import auth_service

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user and organisation",
)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        _org, user = await auth_service.register_user(
            db=db,
            email=body.email,
            password=body.password,
            org_name=body.organization_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    token_payload = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_payload),
        refresh_token=create_refresh_token(token_payload),
    )


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
