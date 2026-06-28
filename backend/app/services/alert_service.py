import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import resend

from app.models.alert import Alert
from app.models.user import User
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
