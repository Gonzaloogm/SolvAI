from __future__ import annotations

import asyncio
import uuid
from datetime import date, datetime, timezone
from typing import Any

from celery.utils.log import get_task_logger
from dateutil.relativedelta import relativedelta
from loguru import logger
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.celery_app import celery_app
from app.core.config import settings
from app.services.agent_orchestrator import ReportGenerationError, run_orchestrator_stream
from app.services.quant_service import client_concentration, complete_months, format_references

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
    from app.models.organization import Organization

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
                
            # ── 1.5 Org fetch (retained for telemetry/logging) ───────────────────
            org = db.execute(
                select(Organization).where(Organization.id == report.organization_id)
            ).scalar_one_or_none()
            
            # NOTE: Free-plan billing gate intentionally removed.
            # Report generation (JSON + AI Score) is always free.
            # The paywall is enforced at PDF download time (GET /reports/{id}/pdf).

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

            logger.info(
                f"[Task {self.request.id}] Found {len(sources)} connected data sources "
                f"for user_id={user_id}: {[(str(s.id), s.type, s.status) for s in sources]}"
            )

            # ── 4. Build financial summary ────────────────────────────────────
            financial_summary = _build_financial_summary(sources)

            if not financial_summary["monthly_revenue_series"]:
                platforms = ", ".join(financial_summary["connected_platforms"]) or "none"
                raise ReportGenerationError(
                    f"No revenue data found in your connected sources ({platforms}). "
                    "Connect a source with at least one successful payment and try again."
                )

            logger.info(
                f"[Task {self.request.id}] financial_summary sent to Gemini: "
                f"data_source_count={financial_summary.get('data_source_count')}, "
                f"avg_monthly_revenue={financial_summary.get('avg_monthly_revenue')}, "
                f"platforms={financial_summary.get('connected_platforms')}"
            )

            # ── 5. Generate the AI report via LangGraph & Publish ─────────────────────────────────────
            import redis.asyncio as aioredis
            import json

            async def _run_and_publish():
                redis_client = await aioredis.from_url(settings.REDIS_URL)
                channel = f"solvai:telemetry:{report_id}"
                
                report_type = getattr(report, "report_type", "FULL")
                
                initial_state = {
                    "transactions": [],
                    "financial_summary": financial_summary,
                    "quant_metrics": {},
                    "draft_report": "",
                    "auditor_feedback": "",
                    "is_approved": False,
                    "iterations": 0,
                    "final_report": {},
                    "requires_human_review": False,
                    "report_type": report_type,
                }
                
                final_data = None
                
                try:
                    async for payload in run_orchestrator_stream(initial_state):
                        # Publish telemetry to Redis
                        await redis_client.publish(channel, json.dumps(payload))
                        
                        if payload.get("status") == "completed":
                            final_data = payload.get("payload", {}).get("final_report", {})
                            if final_data:
                                quant = payload["payload"].get("quant_metrics", {})
                                final_data["quant_metrics"] = quant
                                # Appendix references are the real transactions behind each
                                # factor, never IDs written by the model
                                if quant.get("evidence"):
                                    final_data["data_references"] = format_references(quant["evidence"])
                            # Include score in root for easy access
                            if final_data and "overall_score" in final_data:
                                final_data["overall_score"] = payload.get("payload", {}).get("overall_score")
                finally:
                    await redis_client.close()
                return final_data

            report_data = asyncio.run(_run_and_publish())
            
            if not report_data:
                raise ValueError("Orchestrator failed to produce a final report.")
                
            report_data["financial_summary"] = financial_summary

            # ── 6. Persist results and Upload to S3 ───────────────────────────────
            report.report_data = report_data
            
            # Generate PDF in background
            try:
                import secrets
                from datetime import timedelta
                from app.services.pdf_service import generate_solvency_pdf
                from app.services.storage_service import storage_service
                from app.utils.qr_generator import generate_verification_url, generate_qr_base64
                
                # Pre-generate share token and QR code for the PDF
                if not report.share_token:
                    report.share_enabled = True
                    report.share_expires_at = datetime.now(timezone.utc) + timedelta(days=90)
                    report.share_token = secrets.token_urlsafe(24)
                
                verify_url = generate_verification_url(str(report.id), report.share_token)
                qr_code_b64 = generate_qr_base64(verify_url)
                report.qr_code_b64 = qr_code_b64
                report.verification_id = report.share_token[-8:]
                report.verify_url = verify_url

                pdf_buffer = generate_solvency_pdf(report)
                pdf_bytes = pdf_buffer.getvalue()
                
                try:
                    document_uri = storage_service.upload_report_pdf(
                        pdf_bytes, 
                        str(report.organization_id), 
                        str(report.id)
                    )
                    report.document_uri = document_uri
                    report.status = "COMPLETED"
                    logger.info(f"PDF uploaded to GCS: {document_uri}")
                except Exception as upload_err:
                    logger.error(f"Failed to upload PDF to GCS: {upload_err}")
                    report.document_uri = None
                    # GCS failure is non-fatal — the AI analysis is complete.
                    # Mark COMPLETED so users can read the report; PDF download
                    # will be unavailable but the core report is accessible.
                    report.status = "COMPLETED"
                    
            except Exception as e:
                logger.error(f"Failed to generate/upload PDF: {e}")
                report.document_uri = None
                report.status = "FAILED"
                report.report_data = {**report_data, "error": "The analysis finished but the PDF could not be generated. Please try again."}
                db.commit()
                return {"status": "failed", "report_id": report_id, "error": str(e)}
                
            report.generated_at = datetime.now(timezone.utc)
            report.updated_at = datetime.now(timezone.utc)

            # Extract and store score/rating for fast history queries
            try:
                rd = report_data or {}
                extracted_score = rd.get('overall_score')
                if extracted_score is not None:
                    try:
                        report.overall_score = int(extracted_score)
                    except (ValueError, TypeError):
                        pass

                raw_rating = rd.get('rating', '')
                report.rating = str(raw_rating) if raw_rating else None

                # Generate month string YYYY-MM
                now_utc = datetime.now(timezone.utc)
                report.generated_month = now_utc.strftime('%Y-%m')
            except Exception as score_err:
                logger.warning(f"Could not extract score for history: {score_err}")

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
            
            # ── 8. Create In-App Alert ────────────────────────────────────────
            # Generate alerts based on new report
            try:
                from app.services.alert_service import AlertService
                alert_svc = AlertService(db)
                alert_svc.check_and_generate_alerts(
                    user_id=str(report.user_id),
                    org_id=str(report.organization_id),
                    latest_report=report
                )
            except Exception as e:
                # Don't fail the task if alerts fail
                logger.error(f"Alert generation failed: {e}")

            return {"status": "completed", "report_id": report_id}

        except Exception as exc:
            db.rollback()
            logger.exception(
                "[Task {}] Report generation failed for {}: {}",
                self.request.id,
                report_id,
                str(exc)
            )

            # Honest, user-facing failures (no data, invalid AI output, AI not configured): no retry
            if isinstance(exc, ReportGenerationError):
                _mark_failed(db, report_id, str(exc))
                return {"status": "failed", "error": str(exc)}

            # If it's a quota issue or we hit max retries, fail the report immediately
            if "temporarily unavailable" in str(exc) or self.request.retries >= 3:
                _mark_failed(db, report_id, "AI analysis temporarily unavailable, please try again later.")
                return {"status": "failed", "error": str(exc)}

            # Exponential back-off retry: 60s, 120s, 240s
            countdown = 60 * (2 ** self.request.retries)
            raise self.retry(exc=exc, countdown=countdown)


def _mark_failed(db, report_id: str, message: str) -> None:
    """Mark a report FAILED with a message the UI shows to the user."""
    from app.models.solvency_report import SolvencyReport  # noqa: PLC0415

    try:
        report = db.execute(
            select(SolvencyReport).where(SolvencyReport.id == uuid.UUID(report_id))
        ).scalar_one_or_none()
        if report:
            report.status = "FAILED"
            report.report_data = {"error": message}
            report.updated_at = datetime.now(timezone.utc)
            db.commit()
    except Exception as inner_exc:
        logger.error(f"Could not mark report {report_id} as FAILED: {inner_exc}")


def _fill_missing_months(merged_series: dict[str, dict], today: date | None = None) -> list[dict]:
    """Monthly series from the first payment up to the current month, with empty months as zero.

    Running up to today matters: a client base that stopped paying three months ago
    must show three zero months, not end on the last good month.
    """
    if not merged_series:
        return []
    months = sorted(merged_series)
    current = datetime.strptime(months[0], "%Y-%m")
    this_month = (today or datetime.now(timezone.utc).date()).replace(day=1)
    last = max(datetime.strptime(months[-1], "%Y-%m"), datetime(this_month.year, this_month.month, 1))
    filled = []
    while current <= last:
        key = current.strftime("%Y-%m")
        filled.append(merged_series.get(key, {"month": key, "total": 0, "transaction_count": 0}))
        current += relativedelta(months=1)
    return filled


def _label_clients(transactions: list[dict]) -> list[dict]:
    """Replace client pseudonyms with "Client N", ranked by revenue across all sources."""
    revenue = {}
    for tx in transactions:
        key = (tx["platform"], tx["client"])
        revenue[key] = revenue.get(key, 0) + tx["amount"]
    rank = {key: f"Client {i}" for i, key in enumerate(sorted(revenue, key=revenue.get, reverse=True), 1)}
    labelled = [{**tx, "client": rank[(tx["platform"], tx["client"])]} for tx in transactions]
    return sorted(labelled, key=lambda tx: tx["date"], reverse=True)


def _source_breakdown(per_source: list[tuple[str, list[dict], list[dict]]], total_revenue: float) -> list[dict]:
    """Revenue share and coverage of each connected source."""
    breakdown = []
    for platform, series, txs in per_source:
        revenue = sum(m["total"] for m in series)
        dates = sorted(tx["date"] for tx in txs)
        first, last = (dates[0], dates[-1]) if dates else (None, None)
        breakdown.append({
            "platform": platform,
            "total_revenue": round(revenue, 2),
            "share_percent": round(revenue / total_revenue * 100, 1) if total_revenue else 0.0,
            "transactions": len(txs) or sum(m.get("transaction_count", 0) for m in series),
            "months_covered": len(series),
            "first_date": first,
            "last_date": last,
            "days_covered": (
                (datetime.strptime(last, "%Y-%m-%d") - datetime.strptime(first, "%Y-%m-%d")).days + 1
                if first else None
            ),
        })
    return breakdown


def _build_financial_summary(sources, today: date | None = None) -> dict:
    """
    Build an aggregated financial summary dict from a list of
    FinancialDataSource ORM objects.

    Fetches real transaction data from connected platforms (Stripe, etc.)
    and computes verified metrics to pass to the Gemini AI.
    """
    from app.services.stripe_service import fetch_stripe_metrics

    source_types = [s.type for s in sources]
    source_count = len(sources)

    logger.info(
        f"[_build_financial_summary] source_count={source_count}, "
        f"source_types={source_types}, "
        f"source_ids={[str(s.id) for s in sources]}"
    )

    platform_breakdown = {}
    merged_series = {}
    client_revenue: list[float] = []
    legacy_concentration = None
    transactions: list[dict] = []
    per_source: list[tuple[str, list[dict], list[dict]]] = []
    outflow_sources: list[str] = []  # only bank statements report money going out
    integrity = {"gross": 0.0, "refunded": 0.0, "payments": 0, "refunded_payments": 0, "disputes": 0, "sources": []}

    for source in sources:
        t = source.type
        details = source.connection_details or {}

        if details.get("monthly_revenue_series"):
            series = details["monthly_revenue_series"]
            metrics = {
                "avg_monthly": sum(m.get("revenue", 0) for m in series) / len(series),
                "status": "CONNECTED",
                "data_points": details.get("records_count", 0),
                "monthly_revenue": [
                    {"month": m["month"], "total": m["revenue"], "transaction_count": m.get("transactions", 0),
                     **({"outflows": m["outflows"]} if "outflows" in m else {})}
                    for m in series
                ],
                "client_concentration": details.get("client_concentration"),
                "client_revenue": details.get("client_revenue") or [],
                "transactions": details.get("transactions") or [],
                "payment_integrity": details.get("payment_integrity"),
            }
        elif t == "STRIPE":
            from app.core.security import decrypt_dict
            api_key = None
            enc_data = details.get("encrypted_data")
            if enc_data:
                api_key = decrypt_dict(enc_data).get("api_key")

            try:
                metrics = fetch_stripe_metrics(api_key=api_key)
            except Exception as e:
                logger.error(f"Error fetching Stripe data: {e}")
                metrics = {"avg_monthly": 0, "status": "ERROR", "data_points": 0}
        else:
            # No revenue data for this source: never invent figures
            logger.warning(f"[_build_financial_summary] source {source.id} ({t}) has no revenue data")
            metrics = {"avg_monthly": 0, "status": "NO_DATA", "data_points": 0}

        breakdown = platform_breakdown.setdefault(t, {
            "avg_monthly": 0,
            "status": metrics.get("status", "CONNECTED"),
            "data_points": 0,
            "recent_transactions": metrics.get("transactions_sample", []),
        })
        breakdown["avg_monthly"] += metrics.get("avg_monthly", 0)
        breakdown["data_points"] += metrics.get("data_points", 0)
        if metrics.get("status") == "ERROR":
            breakdown["status"] = "ERROR"

        for m in metrics.get("monthly_revenue", []):
            month = merged_series.setdefault(m["month"], {"month": m["month"], "total": 0, "transaction_count": 0})
            month["total"] += m["total"]
            month["transaction_count"] += m.get("transaction_count", 0)
            if "outflows" in m:
                month["outflows"] = month.get("outflows", 0) + m["outflows"]
                if t not in outflow_sources:
                    outflow_sources.append(t)

        if metrics.get("payment_integrity"):
            for key in ("gross", "refunded", "payments", "refunded_payments", "disputes"):
                integrity[key] += metrics["payment_integrity"].get(key, 0)
            integrity["sources"].append(t)

        source_txs = [{**tx, "platform": t} for tx in metrics.get("transactions") or []]
        transactions.extend(source_txs)
        per_source.append((t, metrics.get("monthly_revenue", []), source_txs))

        # Clients are counted per platform: the same client paying through two
        # platforms appears twice, which slightly understates concentration.
        client_revenue.extend(metrics.get("client_revenue") or [])
        if isinstance(metrics.get("client_concentration"), dict) and not legacy_concentration:
            legacy_concentration = metrics["client_concentration"]

    monthly_revenue_series = _fill_missing_months(merged_series, today)
    total_revenue = sum(m["total"] for m in monthly_revenue_series)
    # Same basis as the quant metrics: the current, incomplete month is left out
    full_months, _ = complete_months(monthly_revenue_series, today)
    avg_monthly = sum(m["total"] for m in full_months) / len(full_months) if full_months else 0

    summary = {
        "data_source_count": source_count,
        "connected_platforms": source_types,
        "avg_monthly_revenue": round(avg_monthly, 2),
        "total_revenue": round(total_revenue, 2),
        "currency": "EUR",
        "analysis_period_months": len(monthly_revenue_series),
        "platform_breakdown": platform_breakdown,
        "monthly_revenue_series": monthly_revenue_series,
        # Sources connected before client-level data existed only have top shares (no HHI)
        "client_concentration": client_concentration(client_revenue) or legacy_concentration,
        "source_breakdown": _source_breakdown(per_source, total_revenue),
        "outflow_sources": outflow_sources,
        "payment_integrity": integrity if integrity["sources"] else None,
        # Ledger for evidence; kept out of the AI prompt (see agent_orchestrator._prompt_summary)
        "transactions": _label_clients(transactions),
    }

    logger.info(
        f"[_build_financial_summary] FINAL payload: "
        f"data_source_count={source_count}, "
        f"avg_monthly_revenue={avg_monthly}, "
        f"platforms={source_types}"
    )

    return summary


@celery_app.task(bind=True, max_retries=3)
def recalculate_solvency_task(self, org_id_str: str) -> dict[str, Any]:
    """
    Triggered by webhooks (e.g. Stripe charge.succeeded).
    Recalculates solvency proactively for the given organization.
    """
    logger.info(f"Proactively recalculating solvency for org {org_id_str}")
    # Full implementation logic would go here
    return {"status": "enqueued_for_recalculation", "org_id": org_id_str}
