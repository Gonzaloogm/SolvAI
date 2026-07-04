#!/usr/bin/env python3
"""
One-off DB cleanup: delete failed/stale reports for the gongarmart org.
Run inside Cloud Run with access to DATABASE_URL.
"""
import asyncio
import os

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text


ORG_ID = "65871283-029e-454f-82e0-b9674e535433"


async def cleanup():
    db_url = os.environ["DATABASE_URL"]
    # Cloud Run sets postgresql:// but asyncpg needs postgresql+asyncpg://
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        r1 = await conn.execute(
            text(
                """
                DELETE FROM solvency_reports
                WHERE status = 'FAILED'
                  AND report_data IS NULL
                  AND organization_id = :org
                """
            ),
            {"org": ORG_ID},
        )
        r2 = await conn.execute(
            text(
                """
                DELETE FROM solvency_reports
                WHERE status = 'GENERATING'
                  AND created_at < NOW() - INTERVAL '15 minutes'
                  AND organization_id = :org
                """
            ),
            {"org": ORG_ID},
        )
        print(
            f"Deleted {r1.rowcount} empty FAILED reports "
            f"and {r2.rowcount} stale GENERATING reports for org {ORG_ID}"
        )
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(cleanup())
