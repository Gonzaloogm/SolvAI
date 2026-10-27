from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from loguru import logger

# Monkeypatch bcrypt for passlib compatibility with bcrypt 4.0+
import bcrypt
if not hasattr(bcrypt, "__about__"):
    class _About:
        __version__ = getattr(bcrypt, "__version__", "4.0.0")
    bcrypt.__about__ = _About

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from cryptography.fernet import Fernet
import json

from app.core.config import settings
from app.core.database import get_db

# ── Password hashing ──────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Encryption ────────────────────────────────────────────────────────────────
if not settings.ENCRYPTION_KEY:
    raise RuntimeError("ENCRYPTION_KEY is not set. See .env.example for how to generate one.")
fernet = Fernet(settings.ENCRYPTION_KEY.encode())

def encrypt_dict(data: dict) -> str:
    """Encrypt a dictionary into a string."""
    return fernet.encrypt(json.dumps(data).encode()).decode()

def decrypt_dict(token: str) -> dict:
    """Decrypt a string back into a dictionary."""
    try:
        return json.loads(fernet.decrypt(token.encode()).decode())
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"decrypt_dict error: {e}")
        return {}

# ── OAuth2 bearer scheme ─────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if plain_password matches the stored hash."""
    return pwd_context.verify(plain_password[:72], hashed_password)


def get_password_hash(password: str) -> str:
    """Return a bcrypt hash of *password*."""
    return pwd_context.hash(password[:72])


# ── JWT token helpers ─────────────────────────────────────────────────────────
def _build_token(data: dict[str, Any], expires_delta: timedelta) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a short-lived JWT access token."""
    delta = expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return _build_token({**data, "token_type": "access"}, delta)


def create_refresh_token(data: dict[str, Any]) -> str:
    """Create a long-lived JWT refresh token (30 days)."""
    return _build_token({**data, "token_type": "refresh"}, timedelta(days=30))


# ── Current-user dependency ──────────────────────────────────────────────────
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Decode the JWT, look up the user in the database, and return the ORM object.
    Raises HTTP 401 on any failure.
    """
    # Import here to avoid circular imports at module level
    from app.models.user import User  # noqa: PLC0415

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token.startswith("sk-solv-"):
        from app.models.api_key import ApiKey
        prefix = token[:12]
        result = await db.execute(
            select(ApiKey).where(ApiKey.key_prefix == prefix, ApiKey.is_active.is_(True))
        )
        api_key = result.scalar_one_or_none()
        if not api_key or not pwd_context.verify(token, api_key.key_hash):
            raise credentials_exception
        # A key stops working when the organisation leaves the Business plan
        from app.core.plans import require_api_access  # noqa: PLC0415
        await require_api_access(db, api_key.organization_id)
        
        user_id = str(api_key.user_id)
    else:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id: str | None = payload.get("sub")
            token_type: str | None = payload.get("token_type")
            if user_id is None or token_type != "access":
                raise credentials_exception
        except JWTError as exc:
            logger.debug(f"JWT decode error: {exc}")
            raise credentials_exception from exc

    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted.is_(False))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    return user
