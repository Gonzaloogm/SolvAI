from __future__ import annotations

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.config import settings
from app.core.database import get_db
from app.schemas.admin import CreateBetaUserRequest, CreateBetaUserResponse
from app.schemas.promo_code import PromoCodeCreate, PromoCodeResponse
from app.services import auth_service
from app.models.organization import Organization
from app.models.promo_code import PromoCode
from app.models.solvency_report import SolvencyReport

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
        # If user exists, update password
        from app.models.user import User
        from app.core.security import get_password_hash
        result = await db.execute(select(User).where(User.email == body.email))
        user = result.scalar_one_or_none()
        if user:
            user.hashed_password = get_password_hash(body.password)
            
            # Also upgrade organization if needed
            org_result = await db.execute(select(Organization).where(Organization.id == user.organization_id))
            org = org_result.scalar_one_or_none()
            if org:
                org.plan = body.plan
                org.status = "active"
                org.current_period_end = datetime(2099, 12, 31, 23, 59, 59)
                db.add(org)
            
            db.add(user)
            await db.commit()
            return CreateBetaUserResponse(
                email=body.email,
                password=body.password,
                plan=body.plan,
                login_url="https://solvai-frontend-879357866699.europe-west1.run.app/login"
            )
        else:
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

@router.post(
    "/create-promo",
    response_model=PromoCodeResponse,
    summary="Admin: Create a promo code",
)
async def create_promo(
    body: PromoCodeCreate,
    x_admin_key: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> PromoCodeResponse:
    if not settings.ADMIN_KEY or x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Admin-Key",
        )
    
    promo = PromoCode(
        code=body.code,
        plan=body.plan,
        max_uses=body.max_uses,
        expires_at=body.expires_at,
    )
    db.add(promo)
    try:
        await db.commit()
        await db.refresh(promo)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not create promo code (maybe code already exists)")
    return promo

@router.get(
    "/promo-stats",
    response_model=list[PromoCodeResponse],
    summary="Admin: Get promo code stats",
)
async def promo_stats(
    x_admin_key: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    if not settings.ADMIN_KEY or x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Admin-Key",
        )
    
    result = await db.execute(select(PromoCode))
    return result.scalars().all()


@router.post("/test-crypto")
async def test_crypto(body: dict):
    from app.core.security import encrypt_dict, decrypt_dict
    import traceback
    try:
        data = body.get("data", {"api_key": "sk_test_123"})
        encrypted = encrypt_dict(data)
        decrypted = decrypt_dict(encrypted)
        
        # also test with exact decrypt logic
        from cryptography.fernet import Fernet
        import json
        from app.core.config import settings
        f = Fernet(settings.ENCRYPTION_KEY.encode())
        raw_decrypt = f.decrypt(encrypted.encode()).decode()
        
        return {
            "success": True,
            "data": data,
            "encrypted": encrypted,
            "decrypted": decrypted,
            "raw_decrypt": raw_decrypt,
            "matches": data == decrypted
        }
    except Exception as e:
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}

@router.delete(
    "/cleanup-failed-reports",
    summary="Admin: Delete FAILED/stale GENERATING reports for an org",
)
async def cleanup_failed_reports(
    org_id: str,
    x_admin_key: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if not settings.ADMIN_KEY or x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Admin-Key",
        )

    import uuid as _uuid
    try:
        org_uuid = _uuid.UUID(org_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid org_id UUID")

    stale_threshold = datetime.now(timezone.utc) - timedelta(minutes=15)

    r1 = await db.execute(
        delete(SolvencyReport).where(
            SolvencyReport.organization_id == org_uuid,
            SolvencyReport.status == "FAILED",
            SolvencyReport.report_data.is_(None),
        )
    )
    r2 = await db.execute(
        delete(SolvencyReport).where(
            SolvencyReport.organization_id == org_uuid,
            SolvencyReport.status == "GENERATING",
            SolvencyReport.created_at < stale_threshold,
        )
    )
    await db.commit()

    return {
        "deleted_failed": r1.rowcount,
        "deleted_stale_generating": r2.rowcount,
        "org_id": org_id,
    }
