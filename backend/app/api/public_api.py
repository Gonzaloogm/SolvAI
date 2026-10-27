from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from passlib.context import CryptContext
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.models.api_key import ApiKey
from app.models.solvency_report import SolvencyReport
from app.core.plans import require_api_access

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def get_api_key(request: Request, db: AsyncSession = Depends(get_db)) -> ApiKey:
    # Accept from X-Api-Key or Authorization Bearer
    auth_header = request.headers.get("Authorization")
    x_api_key = request.headers.get("X-Api-Key")
    
    key_str = None
    if auth_header and auth_header.startswith("Bearer "):
        key_str = auth_header.replace("Bearer ", "")
    elif x_api_key:
        key_str = x_api_key
        
    if not key_str or not key_str.startswith("sk-solv-"):
        raise HTTPException(status_code=401, detail="Invalid API Key format")
    
    prefix = key_str[:12]
    result = await db.execute(select(ApiKey).where(ApiKey.key_prefix == prefix, ApiKey.is_active == True))
    potential_keys = result.scalars().all()
    
    for key in potential_keys:
        if pwd_context.verify(key_str, key.key_hash):
            await require_api_access(db, key.organization_id)
            key.last_used_at = datetime.now(timezone.utc)
            await db.commit()
            return key
            
    raise HTTPException(status_code=401, detail="Invalid or inactive API Key")

@router.post("/assess")
async def create_assessment(
    db: AsyncSession = Depends(get_db),
    api_key: ApiKey = Depends(get_api_key)
):
    report = SolvencyReport(
        organization_id=api_key.organization_id,
        user_id=api_key.user_id,
        status="processing",
        overall_score=None,
        report_type="FULL_SOLVENCY"
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    
    return {"id": str(report.id), "status": report.status}

@router.get("/assess/{report_id}")
async def get_assessment(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    api_key: ApiKey = Depends(get_api_key)
):
    result = await db.execute(select(SolvencyReport).where(
        SolvencyReport.id == report_id,
        SolvencyReport.organization_id == api_key.organization_id
    ))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {
        "id": str(report.id),
        "status": report.status,
        "score": report.overall_score,
        "report_type": report.report_type
    }

@router.get("/verify/{token}")
async def verify_report(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(SolvencyReport).where(SolvencyReport.share_token == token))
    report = result.scalar_one_or_none()
    # Check if report is found and if share is enabled
    if not report or not getattr(report, "share_enabled", False):
        raise HTTPException(status_code=404, detail="Report not found or not shared")
    
    return {
        "id": str(report.id),
        "score": getattr(report, "overall_score", None),
        "status": report.status,
        "created_at": report.created_at,
        "organization_id": str(report.organization_id)
    }
