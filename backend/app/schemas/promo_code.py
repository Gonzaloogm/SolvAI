from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PromoCodeCreate(BaseModel):
    code: str
    plan: Optional[str] = "pro"
    max_uses: Optional[int] = 1
    expires_at: Optional[datetime] = None

class PromoCodeResponse(BaseModel):
    id: str
    code: str
    plan: str
    max_uses: int
    uses_count: int
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class PromoValidateRequest(BaseModel):
    code: str

class PromoValidateResponse(BaseModel):
    valid: bool
    plan: Optional[str] = None
    message: str
