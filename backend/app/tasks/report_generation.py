from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

from celery.utils.log import get_task_logger
from loguru import logger
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.celery_app import celery_app
from app.core.config import settings
from app.services.gemini_service import generate_solvency_report_sync

# ── Synchronous DB engine for Celery (uses psycopg2 instead of asyncpg) ──────
_SYNC_DATABASE_URL = settings.DATABASE_URL.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
).replace(
    "postgresql+asyncpg:", "postgresql:"
)

_sync_engine = create_engine(
    _SYNC_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SyncSessionLocal: sessionmaker[Session] = sessionmaker(
    bind=_sync_engine,
    autoflush=False,
    autocommit=False,
)

task_logger = get_task_logger(__name__)


def _send_completion_email(user_email: str, report_id: str, score: int) -> None:
    """
    Fire-and-forget email notification via Resend.
    Silently skipped if RESEND_API_KEY is not configured.
    """
    if not settings.RESEND_API_KEY:
        logger.debug("RESEND_API_KEY not set – skipping email notification")
        return

    try:
        import resend  # noqa: PLC0415
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send(
            {
                "from": "SolvAI <noreply@solvai.app>",
                "to": user_email,
                "subject": "Your SolvAI Solvency Report is Ready",
                "html": (
                    f"<p>Hi there,</p>"
                    f"<p>Your alternative solvency report has been generated successfully.</p>"
                    f"<p><strong>Overall SolvAI Score: {score}/100</strong></p>"
                    f"<p>Report ID: <code>{report_id}</code></p>"
                    f"<p>Log in to view the full report and explore your lender matches.</p>"
                    f"<br/><p>The SolvAI Team</p>"
                ),
            }
        )
        logger.info(f"Completion email sent to {user_email} for report {report_id}")
    except Exception as exc:
        logger.warning(f"Failed to send completion email: {exc}")


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def generate_solvency_report_task(self, report_id: str, user_id: str) -> dict:
    """
    Celery task that:
    1. Sets the report status to GENERATING
    2. Aggregates financial data from the user's connected data sources
    3. Calls the Gemini service to generate the AI report
    4. Persists the completed report to the database
    5. Sends an email notification via Resend
    6. On failure: marks the report FAILED and retries with exponential back-off
    """
    # Import models inside the task to avoid import-time issues with Alembic
    from app.models.financial_data_source import FinancialDataSource  # noqa: PLC0415
    from app.models.solvency_report import SolvencyReport  # noqa: PLC0415
    from app.models.user import User  # noqa: PLC0415

    logger.info(f"[Task {self.request.id}] Starting report generation for report_id={report_id}")

    with SyncSessionLocal() as db:
        try:
            # ── 1. Fetch the report ───────────────────────────────────────────
            report = db.execute(
                select(SolvencyReport).where(SolvencyReport.id == uuid.UUID(report_id))
            ).scalar_one_or_none()

            if report is None:
                logger.error(f"Report {report_id} not found – aborting task")
                return {"status": "error", "detail": "report not found"}

            # ── 2. Mark as GENERATING ─────────────────────────────────────────
            report.status = "GENERATING"
            report.updated_at = datetime.now(timezone.utc)
            db.commit()

            # ── 3. Fetch connected data sources ───────────────────────────────
            sources = db.execute(
                select(FinancialDataSource).where(
                    FinancialDataSource.user_id == uuid.UUID(user_id),
                    FinancialDataSource.is_deleted.is_(False),
                    FinancialDataSource.status == "CONNECTED",
                )
            ).scalars().all()

            # ── 4. Build financial summary (MVP mock aggregation) ─────────────
            financial_summary = _build_financial_summary(sources)

            # ── 5. Generate the AI report ─────────────────────────────────────
            report_data = generate_solvency_report_sync(financial_summary)

            # ── 6. Persist results ────────────────────────────────────────────
            report.status = "COMPLETED"
            report.report_data = report_data
            report.generated_at = datetime.now(timezone.utc)
            report.updated_at = datetime.now(timezone.utc)
            db.commit()

            logger.info(
                f"[Task {self.request.id}] Report {report_id} completed "
                f"with score={report_data.get('overall_score')}"
            )

            # ── 7. Email notification ─────────────────────────────────────────
            user = db.execute(
                select(User).where(User.id == uuid.UUID(user_id))
            ).scalar_one_or_none()
            if user:
                _send_completion_email(
                    user_email=user.email,
                    report_id=report_id,
                    score=report_data.get("overall_score", 0),
                )

            return {"status": "completed", "report_id": report_id}

        except Exception as exc:
            db.rollback()
            logger.error(
                f"[Task {self.request.id}] Report generation failed for {report_id}: {exc}",
                exc_info=True,
            )

            # Mark report as FAILED
            try:
                report = db.execute(
                    select(SolvencyReport).where(SolvencyReport.id == uuid.UUID(report_id))
                ).scalar_one_or_none()
                if report:
                    report.status = "FAILED"
                    report.updated_at = datetime.now(timezone.utc)
                    db.commit()
            except Exception as inner_exc:
                logger.error(f"Could not mark report as FAILED: {inner_exc}")

            # Exponential back-off retry: 60s, 120s, 240s
            countdown = 60 * (2 ** self.request.retries)
            raise self.retry(exc=exc, countdown=countdown)


def _build_financial_summary(sources) -> dict:
    """
    Build an aggregated financial summary dict from a list of
    FinancialDataSource ORM objects.

    For MVP, this returns a realistic mock based on source type.
    In production this would call the Stripe / Xero / PayPal APIs.
    """
    source_types = [s.type for s in sources]
    source_count = len(sources)

    # Mock aggregated metrics per source type
    avg_monthly_map = {
        "STRIPE": 6_200,
        "XERO": 5_800,
        "PAYPAL": 3_400,
        "MANUAL_UPLOAD": 4_000,
    }

    avg_monthly = sum(avg_monthly_map.get(t, 3_000) for t in source_types)
    avg_monthly = avg_monthly if avg_monthly else 3_500

    return {
        "data_source_count": source_count,
        "connected_platforms": source_types,
        "avg_monthly_revenue": avg_monthly,
        "currency": "EUR",
        "analysis_period_months": 12,
        "mock_data": True,
        "note": (
            "Financial figures are estimated from platform integrations. "
            "Production deployment uses live API data."
        ),
        "platform_breakdown": {
            t: {
                "avg_monthly": avg_monthly_map.get(t, 3_000),
                "status": "CONNECTED",
                "data_points": 52,
            }
            for t in source_types
        },
    }
