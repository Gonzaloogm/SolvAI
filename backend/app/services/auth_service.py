from __future__ import annotations

import uuid
from typing import Tuple

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.organization import Organization
from app.models.user import User


async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    org_name: str,
) -> Tuple[Organization, User]:
    """
    Create a new Organization and its first User atomically.

    Returns:
        (Organization, User) on success.

    Raises:
        ValueError: if the email is already registered.
    """
    # Check for duplicate email
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        raise ValueError(f"Email '{email}' is already registered.")

    org = Organization(
        id=uuid.uuid4(),
        name=org_name.strip(),
    )
    db.add(org)
    # Flush so org.id is available for FK
    await db.flush()

    user = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=email.lower().strip(),
        hashed_password=get_password_hash(password),
    )
    db.add(user)
    await db.flush()

    logger.info(f"Registered new user '{email}' in organization '{org_name}' (org_id={org.id})")
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
