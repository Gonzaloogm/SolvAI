"""Create or update a promo code, e.g. the one judges use to get Pro.

Re-running it updates the plan, limit and expiry of an existing code (its use
count is kept). Codes are case-insensitive.

Run inside the API container on the server:
    docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod exec \
        api python scripts/create_promo_code.py SOLVAI-JUDGES --plan pro --max-uses 300 --expires 2026-12-31
"""
import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone

# Make `app` importable when run from backend/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.models.promo_code import PromoCode  # noqa: E402
from app.services.promo_service import PLAN_RANK, normalize_code  # noqa: E402


async def upsert(code: str, plan: str, max_uses: int, expires: datetime | None) -> None:
    async with AsyncSessionLocal() as db:
        promo = (await db.execute(select(PromoCode).where(PromoCode.code == code))).scalar_one_or_none()
        if promo is None:
            promo = PromoCode(code=code, uses_count=0, created_by="create_promo_code.py")
            db.add(promo)
            action = "Created"
        else:
            action = "Updated"
        promo.plan, promo.max_uses, promo.expires_at, promo.is_active = plan, max_uses, expires, True
        await db.commit()
        print(f"{action} {code}: plan={plan}, max_uses={max_uses}, used={promo.uses_count}, "
              f"expires={expires.date() if expires else 'never'}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("code")
    parser.add_argument("--plan", default="pro", choices=[p for p in PLAN_RANK if p != "free"])
    parser.add_argument("--max-uses", type=int, default=300)
    parser.add_argument("--expires", help="YYYY-MM-DD (end of that day, UTC)")
    args = parser.parse_args()
    expires = (
        datetime.strptime(args.expires, "%Y-%m-%d").replace(hour=23, minute=59, tzinfo=timezone.utc)
        if args.expires else None
    )
    asyncio.run(upsert(normalize_code(args.code), args.plan, args.max_uses, expires))


if __name__ == "__main__":
    main()
