from fastapi import APIRouter, Depends, HTTPException, Security, Header
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.models.api_key import ApiKey
from app.models.solvency_report import SolvencyReport

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_api_key(x_api_key: str = Header(...), db: Session = Depends(get_db)) -> ApiKey:
    if not x_api_key.startswith("sk-solv-"):
        raise HTTPException(status_code=401, detail="Invalid API Key format")
    
    prefix = x_api_key[:12]
    potential_keys = db.query(ApiKey).filter(ApiKey.key_prefix == prefix, ApiKey.is_active == True).all()
    
    for key in potential_keys:
        if pwd_context.verify(x_api_key, key.key_hash):
            key.last_used_at = datetime.now(timezone.utc)
            db.commit()
            return key
            
    raise HTTPException(status_code=401, detail="Invalid or inactive API Key")

@router.post("/assess")
def create_assessment(
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(get_api_key)
):
    report = SolvencyReport(
        organization_id=api_key.organization_id,
        user_id=api_key.user_id,
        status="processing",
        score=None
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return {"id": str(report.id), "status": report.status}

@router.get("/assess/{report_id}")
def get_assessment(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(get_api_key)
):
    report = db.query(SolvencyReport).filter(
        SolvencyReport.id == report_id,
        SolvencyReport.organization_id == api_key.organization_id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {
        "id": str(report.id),
        "status": report.status,
        "score": report.score,
        "report_type": report.report_type
    }

@router.get("/verify/{token}")
def verify_report(
    token: str,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(get_api_key)
):
    report = db.query(SolvencyReport).filter(SolvencyReport.share_token == token).first()
    if not report or not report.is_shared:
        raise HTTPException(status_code=404, detail="Report not found or not shared")
    
    return {
        "id": str(report.id),
        "score": report.score,
        "summary": report.summary,
        "status": report.status,
        "created_at": report.created_at,
        "organization_id": str(report.organization_id)
    }
