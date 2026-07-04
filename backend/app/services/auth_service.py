from __future__ import annotations

import uuid
from typing import Tuple

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.organization import Organization
from app.models.user import User


from datetime import datetime, timedelta, timezone

async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    org_name: str | None = None,
    full_name: str | None = None,
    promo_code: str | None = None,
) -> Tuple[Organization, User]:
    """
    Create a new Organization and its first User atomically.
    Handles promo code validation and organization plan upgrades.

    Returns:
        (Organization, User) on success.

    Raises:
        ValueError: if the email is already registered or promo code is invalid.
    """
    from app.models.promo_code import PromoCode

    # Check for duplicate email
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        raise ValueError(f"Email '{email}' is already registered.")

    # Validate promo code first if provided
    promo_record = None
    if promo_code:
        promo_result = await db.execute(select(PromoCode).where(PromoCode.code == promo_code))
        promo_record = promo_result.scalar_one_or_none()
        if not promo_record:
            raise ValueError("Invalid promo code.")
        if not promo_record.is_active:
            raise ValueError("Promo code is no longer active.")
        if promo_record.uses_count >= promo_record.max_uses:
            raise ValueError("Promo code has reached its usage limit.")
        if promo_record.expires_at and promo_record.expires_at < datetime.now(timezone.utc):
            raise ValueError("Promo code has expired.")

    # Determine org name
    final_org_name = org_name.strip() if org_name and org_name.strip() else ""
    if not final_org_name:
        if full_name and full_name.strip():
            final_org_name = f"{full_name.strip()}'s Organization"
        else:
            final_org_name = "My Organization"

    org = Organization(
        id=uuid.uuid4(),
        name=final_org_name,
    )
    
    if promo_record:
        org.plan = promo_record.plan
        org.status = "active"
        # current_period_end column is timezone-naive — use utcnow() to avoid
        # asyncpg "can't subtract offset-naive and offset-aware datetimes" error
        org.current_period_end = datetime.utcnow() + timedelta(days=365)
        promo_record.uses_count += 1
        db.add(promo_record)

    db.add(org)
    # Flush so org.id is available for FK
    await db.flush()

    user = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=email.lower().strip(),
        hashed_password=get_password_hash(password),
    )
    # Store full_name if you add it to User in future, ignoring for now as it wasn't requested for User model
    
    db.add(user)
    await db.flush()

    logger.info(f"Registered new user '{email}' in organization '{final_org_name}' (org_id={org.id})")
    return org, user


async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> User | None:
    """
    Validate *email* and *password*.

    Returns the User ORM object on success, or None if credentials are invalid.
    """
    result = await db.execute(
        select(User).where(User.email == email.lower().strip(), User.is_deleted.is_(False))
    )
    user = result.scalar_one_or_none()
    if user is None:
        logger.debug(f"Login attempt for unknown email: {email}")
        return None

    if not verify_password(password, user.hashed_password):
        logger.debug(f"Invalid password for email: {email}")
        return None

    logger.info(f"User '{email}' authenticated successfully")
    return user


async def change_password(
    db: AsyncSession,
    user: User,
    current_password: str,
    new_password: str,
) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Incorrect current password")
    
    user.hashed_password = get_password_hash(new_password)
    # The caller (router) should commit the transaction
    db.add(user)
    logger.info(f"User '{user.email}' changed their password")
