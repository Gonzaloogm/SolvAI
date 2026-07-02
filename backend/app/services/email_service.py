import os
import asyncio
from loguru import logger
import resend

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

def send_welcome_email(email: str, plan: str):
    subject = "Welcome to SolvAI — your account is ready"
    html = f"""
    <html>
        <body>
            <h1>Welcome to SolvAI!</h1>
            <p>Your account has been created successfully.</p>
            <p>You are currently on the <strong>{plan}</strong> plan.</p>
            <p>Thanks,<br>The SolvAI Team</p>
        </body>
    </html>
    """
    if RESEND_API_KEY:
        try:
            resend.Emails.send({
                "from": "SolvAI <onboarding@resend.dev>",
                "to": [email],
                "subject": subject,
                "html": html
            })
            logger.info(f"Welcome email sent to {email}")
        except Exception as e:
            logger.error(f"Failed to send welcome email to {email}: {e}")
    else:
        logger.info(f"[STUB] Welcome email to {email} | Plan: {plan}")

async def send_welcome_email_async(email: str, plan: str):
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, send_welcome_email, email, plan)
