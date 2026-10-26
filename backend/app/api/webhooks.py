import base64
import hashlib
import hmac
from fastapi import APIRouter, Request, HTTPException, Header
import stripe
from loguru import logger
from app.core.config import settings
from app.tasks.report_generation import recalculate_solvency_task
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.organization import Organization
import datetime

router = APIRouter()

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None)
):
    if not settings.STRIPE_API_KEY: # Using API key as fallback or we can use a dedicated webhook secret
        logger.error("STRIPE_API_KEY is not set")
        raise HTTPException(status_code=500, detail="Server config error")
        
    # We expect STRIPE_WEBHOOK_SECRET to be configured, fallback to API key for MVP if missing
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", settings.STRIPE_API_KEY)

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, webhook_secret
        )
    except ValueError as e:
        logger.error("Invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError as e:
        logger.error("Invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = getattr(event, "type", "")
    if event_type == "charge.succeeded":
        event_data = getattr(event, "data", None)
        charge = getattr(event_data, "object", None) if event_data else None
        if charge:
            metadata = getattr(charge, 'metadata', {})
            if hasattr(metadata, 'get'):
                org_id = metadata.get('org_id', 'default-org')
            else:
                org_id = getattr(metadata, 'org_id', 'default-org')
            logger.info(f"Received charge.succeeded. Enqueuing recalculate_solvency_task for org: {org_id}")
            recalculate_solvency_task.delay(org_id)

    return {"status": "success"}

@router.post("/xero")
async def xero_webhook(
    request: Request,
    xero_signature: str = Header(None, alias="x-xero-signature")
):
    # Xero signs the raw body: base64(HMAC-SHA256(body, webhook key))
    if not settings.XERO_WEBHOOK_KEY:
        raise HTTPException(status_code=503, detail="Xero webhooks are not configured")
    payload = await request.body()

    expected_sig = base64.b64encode(
        hmac.new(settings.XERO_WEBHOOK_KEY.encode(), payload, hashlib.sha256).digest()
    ).decode()
    if not xero_signature or not hmac.compare_digest(xero_signature, expected_sig):
        # Xero's intent-to-receive check expects 401 for a bad signature
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = await request.json()
    events = data.get("events", [])
    
    for event in events:
        if event.get("eventCategory") == "INVOICE" and event.get("eventType") == "UPDATE":
            org_id = event.get("tenantId", "default-org")
            logger.info(f"Received Xero Invoice update. Enqueuing recalculate_solvency_task for org: {org_id}")
            recalculate_solvency_task.delay(org_id)

    return {"status": "success"}

@router.post("/stripe-billing")
async def stripe_billing_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    webhook_secret = getattr(settings, "STRIPE_BILLING_WEBHOOK_SECRET", None)
    if not webhook_secret:
        logger.error("STRIPE_BILLING_WEBHOOK_SECRET is not set")
        raise HTTPException(status_code=500, detail="Server config error")

    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, webhook_secret
        )
    except ValueError as e:
        logger.error("Invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError as e:
        logger.error("Invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = getattr(event, "type", "")
    event_data = getattr(event, "data", None)
    obj = getattr(event_data, "object", None) if event_data else None

    if not obj:
        return {"status": "success"}

    try:
        if event_type == "checkout.session.completed":
            org_id = obj.get("client_reference_id")
            if not org_id:
                logger.warning(
                    "checkout.session.completed received with no client_reference_id — skipping"
                )
                return {"status": "success"}

            result = await db.execute(select(Organization).where(Organization.id == org_id))
            org = result.scalar_one_or_none()
            if not org:
                logger.warning(
                    f"checkout.session.completed: org {org_id} not found — skipping"
                )
                return {"status": "success"}

            session_mode = obj.get("mode")  # "payment" | "subscription"

            if session_mode == "subscription":
                # ── 29€/mo Pro subscription upgrade ──────────────────────────
                org.stripe_customer_id = obj.get("customer")
                org.stripe_subscription_id = obj.get("subscription")
                org.plan = "pro"
                logger.info(
                    f"Org {org_id} upgraded to Pro via subscription {obj.get('subscription')}"
                )

            elif session_mode == "payment":
                # ── 9€ one-time PDF unlock ────────────────────────────────────
                metadata = obj.get("metadata") or {}
                report_id = metadata.get("report_id")

                if not report_id:
                    logger.error(
                        f"checkout.session.completed (payment) for org {org_id} "
                        f"is missing metadata.report_id — cannot unlock PDF. "
                        f"Ensure the Stripe checkout session is created with "
                        f"metadata={{'report_id': '<uuid>'}}"
                    )
                    # Return 200 so Stripe does not retry; the fault is in
                    # checkout session creation, not in this handler.
                    return {"status": "success"}

                # Safe JSONB mutation: copy-append pattern ensures SQLAlchemy
                # detects the change (in-place list.append() is NOT tracked).
                current_ids: list = list(org.unlocked_report_ids or [])
                if report_id not in current_ids:
                    current_ids.append(report_id)
                    org.unlocked_report_ids = current_ids
                    logger.info(
                        f"Org {org_id}: PDF unlocked for report {report_id} "
                        f"via one-time payment"
                    )
                else:
                    logger.info(
                        f"Org {org_id}: report {report_id} already unlocked — "
                        f"idempotent skip"
                    )

                # Record Stripe customer ID for future CRM lookups
                if obj.get("customer"):
                    org.stripe_customer_id = obj.get("customer")

            else:
                logger.warning(
                    f"checkout.session.completed with unknown mode='{session_mode}' — skipping"
                )

            # Single atomic commit for the entire checkout.session.completed handler
            await db.commit()

        elif event_type in ["customer.subscription.updated", "customer.subscription.deleted"]:
            sub_id = obj.get("id")
            result = await db.execute(
                select(Organization).where(Organization.stripe_subscription_id == sub_id)
            )
            org = result.scalar_one_or_none()
            if org:
                if event_type == "customer.subscription.deleted":
                    org.status = "canceled"
                    org.plan = "free"
                    logger.info(
                        f"Subscription {sub_id} deleted — org plan reset to free"
                    )
                else:
                    org.status = obj.get("status")

                    # Update plan based on price ID
                    items = obj.get("items", {}).get("data", [])
                    if items:
                        price_id = items[0].get("price", {}).get("id")
                        if price_id == settings.STRIPE_PRO_PRICE_ID:
                            org.plan = "pro"
                        elif price_id == settings.STRIPE_BUSINESS_PRICE_ID:
                            org.plan = "business"

                # Update billing period end
                period_end = obj.get("current_period_end")
                if period_end:
                    org.current_period_end = datetime.datetime.fromtimestamp(
                        period_end, tz=datetime.timezone.utc
                    )
                await db.commit()

        elif event_type == "invoice.payment_failed":
            sub_id = obj.get("subscription")
            if sub_id:
                result = await db.execute(
                    select(Organization).where(Organization.stripe_subscription_id == sub_id)
                )
                org = result.scalar_one_or_none()
                if org:
                    org.status = "past_due"
                    await db.commit()
                    logger.warning(
                        f"Invoice payment failed for subscription {sub_id} — "
                        f"org marked past_due"
                    )

    except Exception as e:
        logger.error(
            f"Unhandled error processing webhook event '{event_type}': {e}",
            exc_info=True,
        )
        await db.rollback()
        # Return 200 to prevent Stripe from retrying on transient DB errors.
        # Monitor application logs for these failures.
        return {"status": "error", "detail": "internal processing error"}

    return {"status": "success"}
