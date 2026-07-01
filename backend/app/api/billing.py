import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.organization import Organization
from loguru import logger

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY

PRICE_IDS = {
    'pro': 'price_1TmXbZDkCeEPqzVBHcP9LP9i',
    'business': 'price_1TmXbYDkCeEPqzVBZfdqb8fr',
}

FRONTEND_URL = getattr(settings, 'FRONTEND_URL', None) or 'https://solvai-frontend-879357866699.europe-west1.run.app'

class CheckoutRequest(BaseModel):
    plan: str  # 'pro' or 'business'

@router.post('/create-checkout-session')
async def create_checkout_session(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    price_id = PRICE_IDS.get(body.plan)
    if not price_id:
        raise HTTPException(400, 'Invalid plan')
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            mode='subscription',
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            success_url=(
                f"{FRONTEND_URL}/account"
                f"?checkout=success&plan={body.plan}"
            ),
            cancel_url=(
                f"{FRONTEND_URL}/account"
                f"?checkout=cancelled"
            ),
            customer_email=current_user.email,
            metadata={
                'user_id': str(current_user.id),
                'organization_id': str(current_user.organization_id),
                'plan': body.plan,
            },
            allow_promotion_codes=True,
        )
        return {'checkout_url': session.url, 'session_id': session.id}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Error: {e}")
        raise HTTPException(400, str(e))

@router.get('/subscription')
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(404, 'Organization not found')
    return {
        'plan': org.plan,
        'status': org.status,
        'current_period_end': org.current_period_end,
    }

@router.post('/webhook')
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    payload = await request.body()
    sig = request.headers.get('stripe-signature')
    
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
    
    if not webhook_secret:
        # In test mode without webhook secret, skip signature validation
        logger.warning("STRIPE_WEBHOOK_SECRET not set. Skipping signature validation. This is UNSAFE for production.")
        try:
            import json
            event = json.loads(payload)
        except Exception as e:
            raise HTTPException(400, f"Error parsing payload: {str(e)}")
    else:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig, webhook_secret
            )
        except ValueError as e:
            logger.error("Invalid payload")
            raise HTTPException(400, 'Invalid payload')
        except stripe.error.SignatureVerificationError as e:
            logger.error("Invalid signature")
            raise HTTPException(400, 'Invalid signature')
        except Exception as e:
            logger.error(f"Webhook exception: {e}")
            raise HTTPException(400, str(e))
    
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        metadata = session.get('metadata', {})
        org_id = metadata.get('organization_id')
        plan = metadata.get('plan', 'pro')
        
        if org_id:
            try:
                result = await db.execute(
                    select(Organization).where(Organization.id == uuid.UUID(org_id))
                )
                org = result.scalar_one_or_none()
                if org:
                    org.plan = plan
                    org.status = 'active'
                    org.stripe_subscription_id = session.get('subscription')
                    org.current_period_end = datetime.utcnow() + timedelta(days=30)
                    await db.commit()
                    logger.info(f"Organization {org_id} upgraded to {plan} via Stripe webhook")
            except Exception as db_err:
                logger.error(f"Database error during checkout.session.completed: {db_err}")
                await db.rollback()
    
    elif event['type'] == 'customer.subscription.deleted':
        sub = event['data']['object']
        try:
            result = await db.execute(
                select(Organization).where(Organization.stripe_subscription_id == sub['id'])
            )
            org = result.scalar_one_or_none()
            if org:
                org.plan = 'free'
                org.status = 'active'
                org.stripe_subscription_id = None
                await db.commit()
                logger.info(f"Organization {org.id} downgraded to free via Stripe webhook")
        except Exception as db_err:
            logger.error(f"Database error during customer.subscription.deleted: {db_err}")
            await db.rollback()
            
    elif event['type'] == 'customer.subscription.updated':
        sub = event['data']['object']
        try:
            result = await db.execute(
                select(Organization).where(Organization.stripe_subscription_id == sub['id'])
            )
            org = result.scalar_one_or_none()
            if org:
                status = sub.get('status')
                if status == 'active':
                    pass
                elif status == 'past_due':
                    logger.warning(f"Subscription {sub['id']} is past due. Alerting user.")
                elif status == 'canceled':
                    org.plan = 'free'
                    org.status = 'active'
                    org.stripe_subscription_id = None
                await db.commit()
                logger.info(f"Organization {org.id} subscription updated to status {status}")
        except Exception as db_err:
            logger.error(f"Database error during customer.subscription.updated: {db_err}")
            await db.rollback()

    return {'received': True}
