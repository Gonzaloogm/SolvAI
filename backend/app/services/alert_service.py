import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import Session
import resend

from app.models.alert import Alert
from app.models.user import User
from app.models.solvency_report import SolvencyReport
from app.core.config import settings

logger = logging.getLogger(__name__)

async def create_alert(
    db: AsyncSession,
    user_id: str,
    organization_id: str,
    type: str,
    title: str,
    message: str,
    action_url: str | None = None
) -> Alert:
    """Create a new alert and optionally send an email notification."""
    alert = Alert(
        user_id=user_id,
        organization_id=organization_id,
        type=type,
        title=title,
        message=message,
        action_url=action_url,
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    
    # Optionally trigger an email
    if settings.RESEND_API_KEY:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user and user.email:
            try:
                resend.api_key = settings.RESEND_API_KEY
                email_params = {
                    "from": "SolvAI <onboarding@resend.dev>",
                    "to": [user.email],
                    "subject": f"SolvAI Alert: {title}",
                    "html": f"<p>{message}</p>" + (f'<p><a href="{settings.FRONTEND_URL}{action_url}">Action Link</a></p>' if hasattr(settings, "FRONTEND_URL") and action_url else "")
                }
                resend.Emails.send(email_params)
            except Exception as e:
                logger.error(f"Failed to send alert email: {e}")

    return alert


class AlertService:
    def __init__(self, db: Session):
        self.db = db

    def check_and_generate_alerts(self, user_id: str, org_id: str, latest_report: SolvencyReport):
        """
        Check conditions based on the new report and generate alerts.
        """
        logger.info(f"Checking alerts for user {user_id}, org {org_id}")
        
        # 1. Report Ready Alert
        score = latest_report.overall_score or 0
        
        ready_alert = Alert(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id),
            organization_id=uuid.UUID(org_id),
            type="REPORT_READY",
            title="Report Generated Successfully",
            message=f"Your report is ready. Score: {score}/100.",
            action_url="/reports"
        )
        self.db.add(ready_alert)
        
        # 2. Check for Score Drop / Improve by finding the previous report
        # We need the most recent completed report before this one
        prev_report = self.db.execute(
            select(SolvencyReport)
            .where(
                SolvencyReport.organization_id == uuid.UUID(org_id),
                SolvencyReport.status == "COMPLETED",
                SolvencyReport.id != latest_report.id
            )
            .order_by(SolvencyReport.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        
        if prev_report and prev_report.overall_score is not None and latest_report.overall_score is not None:
            delta = latest_report.overall_score - prev_report.overall_score
            if delta <= -5:
                drop_alert = Alert(
                    id=uuid.uuid4(),
                    user_id=uuid.UUID(user_id),
                    organization_id=uuid.UUID(org_id),
                    type="SCORE_DROP",
                    severity="warning",
                    title=f"Score dropped by {abs(delta)} points",
                    message=f"Your solvency score fell from {prev_report.overall_score} to {latest_report.overall_score}.",
                    metadata={"delta": delta, "score": latest_report.overall_score},
                    action_url="/reports"
                )
                self.db.add(drop_alert)
            elif delta >= 5:
                improve_alert = Alert(
                    id=uuid.uuid4(),
                    user_id=uuid.UUID(user_id),
                    organization_id=uuid.UUID(org_id),
                    type="SCORE_IMPROVE",
                    severity="success",
                    title=f"Score improved by {delta} points!",
                    message=f"Your solvency score rose from {prev_report.overall_score} to {latest_report.overall_score}.",
                    metadata={"delta": delta, "score": latest_report.overall_score},
                    action_url="/reports"
                )
                self.db.add(improve_alert)
                
        self.db.commit()
