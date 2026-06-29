import uuid
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from passlib.context import CryptContext

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.api_key import ApiKey

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ApiKeyCreate(BaseModel):
    name: str

class ApiKeyOut(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    is_active: bool

class ApiKeyCreateOut(ApiKeyOut):
    key: str

@router.get("/", response_model=list[ApiKeyOut])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ApiKey).where(ApiKey.organization_id == current_user.organization_id))
    keys = result.scalars().all()
    return keys

@router.post("/", response_model=ApiKeyCreateOut)
async def create_api_key(
    data: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raw_key = f"sk-solv-{secrets.token_hex(24)}"
    key_hash = pwd_context.hash(raw_key)
    key_prefix = raw_key[:12]
    
    db_key = ApiKey(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        name=data.name,
        key_hash=key_hash,
        key_prefix=key_prefix,
    )
    db.add(db_key)
    await db.commit()
    await db.refresh(db_key)
    
    return {
        "id": db_key.id,
        "name": db_key.name,
        "key_prefix": db_key.key_prefix,
        "is_active": db_key.is_active,
        "key": raw_key
    }

@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.organization_id == current_user.organization_id))
    db_key = result.scalar_one_or_none()
    if not db_key:
        raise HTTPException(status_code=404, detail="API Key not found")
    
    await db.delete(db_key)
    await db.commit()
    return {"message": "API Key revoked"}
