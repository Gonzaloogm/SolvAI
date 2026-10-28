"""Promo codes: checked and applied the same way at sign-up and when redeemed later."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.promo_code import PromoCode

PROMO_PERIOD_DAYS = 365
PLAN_RANK = {"free": 0, "pro": 1, "business": 2}


def normalize_code(code: str) -> str:
    """Codes are case-insensitive: stored and looked up in upper case."""
    return code.strip().upper()


async def get_valid_promo(db: AsyncSession, code: str) -> PromoCode:
    """The promo code row, locked for update; ValueError with a user-facing reason otherwise."""
    result = await db.execute(
        select(PromoCode).where(PromoCode.code == normalize_code(code)).with_for_update()
    )
    promo = result.scalar_one_or_none()
    if not promo:
        raise ValueError("Invalid promo code.")
    if not promo.is_active:
        raise ValueError("Promo code is no longer active.")
    if promo.uses_count >= promo.max_uses:
        raise ValueError("Promo code has reached its usage limit.")
    if promo.expires_at and promo.expires_at < datetime.now(timezone.utc):
        raise ValueError("Promo code has expired.")
    return promo


def apply_promo(org: Organization, promo: PromoCode) -> None:
    """Give the organisation the code's plan for a year and count the use."""
    if PLAN_RANK.get(org.plan or "free", 0) >= PLAN_RANK.get(promo.plan, 0):
        raise ValueError(f"Your plan already includes everything in {promo.plan.capitalize()}.")
    org.plan = promo.plan
    org.status = "active"
    # current_period_end column is timezone-naive
    org.current_period_end = datetime.utcnow() + timedelta(days=PROMO_PERIOD_DAYS)
    promo.uses_count += 1
