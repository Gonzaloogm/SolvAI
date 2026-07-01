import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.models.verification_request import VerificationRequest
from app.core.database import get_db
from app.core.config import settings

router = APIRouter()

class VerificationRequestIn(BaseModel):
    applicant_email: EmailStr
    requester_name: str
    requester_company: str
    requester_email: EmailStr
    property_address: Optional[str] = None
    monthly_rent: Optional[float] = None
    message: Optional[str] = None

class AuthorizeRequest(BaseModel):
    stripe_api_key: str

@router.post("/request")
async def create_verification_request(
    payload: VerificationRequestIn,
    db: AsyncSession = Depends(get_db)
):
    token = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    new_request = VerificationRequest(
        token=token,
        applicant_email=payload.applicant_email,
        requester_name=payload.requester_name,
        requester_company=payload.requester_company,
        requester_email=payload.requester_email,
        property_address=payload.property_address,
        monthly_rent=payload.monthly_rent,
        expires_at=expires_at
    )
    db.add(new_request)
    await db.commit()
    await db.refresh(new_request)
    
    if settings.RESEND_API_KEY:
        try:
            import resend
            resend.api_key = settings.RESEND_API_KEY
            frontend_url = "http://localhost:5173" if settings.ENVIRONMENT == "development" else "https://app.solvai.com"
            auth_link = f"{frontend_url}/verify/authorize/{token}"
            
            body = (
                f"{payload.requester_name} from {payload.requester_company} has "
                f"requested a financial solvency verification to process your application.\n\n"
                f"Click the link below to authorize SolvAI to generate your verification report. "
                f"This is FREE for you — {payload.requester_company} covers the cost.\n\n"
                f"Authorize verification -> {auth_link}\n\n"
                f"This link expires in 7 days."
            )
            
            resend.Emails.send({
                "from": "SolvAI <onboarding@resend.dev>",
                "to": [payload.applicant_email],
                "subject": f"{payload.requester_company} has requested your SolvAI solvency verification",
                "text": body,
            })
        except Exception as e:
            # We log it but do not fail the request if email fails for now
            pass
            
    return {
        "request_id": str(new_request.id),
        "status": new_request.status,
        "message": "Verification request sent to applicant"
    }

@router.get("/authorize/{token}")
async def get_verification_request(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(VerificationRequest).where(VerificationRequest.token == token))
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.expires_at and req.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Request expired")
        
    return {
        "id": str(req.id),
        "applicant_email": req.applicant_email,
        "requester_name": req.requester_name,
        "requester_company": req.requester_company,
        "property_address": req.property_address,
        "monthly_rent": req.monthly_rent,
        "status": req.status
    }

@router.post("/authorize/{token}")
async def authorize_verification_request(
    token: str,
    payload: AuthorizeRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(VerificationRequest).where(VerificationRequest.token == token))
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.status != "PENDING_APPLICANT":
        raise HTTPException(status_code=400, detail="Request already processed")
        
    # In a full implementation, we'd kick off the report generation Celery task here,
    # passing the stripe_api_key.
    req.status = "GENERATING"
    await db.commit()
    
    return {
        "id": str(req.id),
        "status": req.status,
        "message": "Authorization successful, report generating."
    }

@router.get("/status/{request_id}")
async def get_verification_status(
    request_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(VerificationRequest).where(VerificationRequest.id == request_id))
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    return {
        "id": str(req.id),
        "status": req.status
    }
