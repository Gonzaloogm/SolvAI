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
from app.models.solvency_report import SolvencyReport
from app.services import paypal_billing
from app.services.paypal_billing import PayPalBillingError
from loguru import logger

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY

PRICE_IDS = {
    'pro': settings.STRIPE_PRO_PRICE_ID,
    'business': settings.STRIPE_BUSINESS_PRICE_ID,
}

FRONTEND_URL = settings.FRONTEND_URL.rstrip('/')

class CheckoutRequest(BaseModel):
    plan: str  # 'pro' or 'business'

@router.post('/create-checkout-session')
async def create_checkout_session(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if body.plan not in PRICE_IDS:
        raise HTTPException(400, 'Invalid plan')
    price_id = PRICE_IDS[body.plan]
    if not price_id:
        logger.error(f"STRIPE_{body.plan.upper()}_PRICE_ID is not configured")
        raise HTTPException(503, 'Billing is not configured')
    
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
            # Stripe promotion codes disabled — we use app-level promo codes
            # at registration instead (a promo code for the Pro plan).
            # allow_promotion_codes=True,
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
        'billing_provider': org.billing_provider,
        'paypal_available': paypal_billing.is_configured(),
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
        # Never accept unsigned events: they could upgrade any organisation or unlock PDFs for free
        logger.error("STRIPE_WEBHOOK_SECRET is not set; rejecting Stripe webhook")
        raise HTTPException(503, "Stripe webhooks are not configured")
    if not sig:
        logger.error("Missing signature header")
        raise HTTPException(400, "Missing signature")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig, webhook_secret
        )
    except ValueError:
        logger.error("Invalid payload")
        raise HTTPException(400, 'Invalid payload')
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid signature")
        raise HTTPException(400, 'Invalid signature')
    except Exception as e:
        logger.error(f"Webhook exception: {e}")
        raise HTTPException(400, str(e))

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        metadata = session.get('metadata', {})
        
        report_id = metadata.get('report_id')
        if report_id:
            try:
                result = await db.execute(
                    select(SolvencyReport).where(SolvencyReport.id == uuid.UUID(report_id))
                )
                report = result.scalar_one_or_none()
                if report:
                    report.pdf_unlocked = True
                    report.pdf_unlocked_at = datetime.utcnow()
                    report.stripe_payment_intent_id = session.get('payment_intent')
                    await db.commit()
                    logger.info(f"Report {report_id} unlocked via Stripe webhook")
            except Exception as db_err:
                logger.error(f"Database error during report unlock: {db_err}")
                await db.rollback()
            return {'received': True}

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
                    org.billing_provider = 'stripe'
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
                org.billing_provider = None
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
                    org.billing_provider = None
                org.billing_provider = None
                await db.commit()
                logger.info(f"Organization {org.id} subscription updated to status {status}")
        except Exception as db_err:
            logger.error(f"Database error during customer.subscription.updated: {db_err}")
            await db.rollback()

    return {'received': True}

class PromoApplyRequest(BaseModel):
    code: str

@router.post('/apply-promo')
async def apply_promo(
    body: PromoApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.services.promo_service import apply_promo as apply_promo_code, get_valid_promo

    org_result = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(404, "Organization not found")

    try:
        promo = await get_valid_promo(db, body.code)
        apply_promo_code(org, promo)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    await db.commit()

    return {"message": f"Successfully upgraded to {promo.plan} plan."}

class ReportCheckoutRequest(BaseModel):
    report_id: uuid.UUID

@router.post('/create-report-checkout')
async def create_report_checkout(
    body: ReportCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """One-time €9 payment to unlock a report PDF."""
    # Verify report belongs to user's org and is completed
    result = await db.execute(
        select(SolvencyReport).where(
            SolvencyReport.id == body.report_id,
            SolvencyReport.organization_id == current_user.organization_id,
            SolvencyReport.status == 'COMPLETED',
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")

    if report.pdf_unlocked:
        raise HTTPException(400, "PDF already unlocked")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            mode='payment',
            line_items=[{
                'price_data': {
                    'currency': 'eur',
                    'unit_amount': 900,  # €9.00
                    'product_data': {
                        'name': 'SolvAI Report PDF',
                        'description': (
                            f'Certified solvency report PDF '
                            f'with QR verification. '
                            f'ID: {str(body.report_id)[:8].upper()}'
                        ),
                    },
                },
                'quantity': 1,
            }],
            success_url=(
                f"{FRONTEND_URL}/reports"
                f"?pdf_unlocked={body.report_id}"
            ),
            cancel_url=f"{FRONTEND_URL}/reports",
            customer_email=current_user.email,
            metadata={
                'report_id': str(body.report_id),
                'user_id': str(current_user.id),
                'org_id': str(current_user.organization_id),
                'type': 'report_pdf_unlock',
            },
        )
        return {'checkout_url': session.url, 'session_id': session.id}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Error in create_report_checkout: {e}")
        raise HTTPException(400, str(e))


# ── PayPal Subscriptions ──────────────────────────────────────────────────────

class PayPalSubscribeRequest(BaseModel):
    plan: str  # 'pro' or 'business'


class PayPalConfirmRequest(BaseModel):
    subscription_id: str


async def _org_for(user: User, db: AsyncSession) -> Organization:
    org = (await db.execute(
        select(Organization).where(Organization.id == user.organization_id)
    )).scalar_one_or_none()
    if not org:
        raise HTTPException(404, 'Organization not found')
    return org


@router.post('/paypal/subscribe')
async def paypal_subscribe(
    body: PayPalSubscribeRequest,
    current_user: User = Depends(get_current_user),
):
    if body.plan not in paypal_billing.PLAN_NAMES:
        raise HTTPException(400, 'Invalid plan')
    if not paypal_billing.is_configured():
        raise HTTPException(503, 'PayPal billing is not configured')
    try:
        return await paypal_billing.create_subscription(
            plan=body.plan,
            org_id=str(current_user.organization_id),
            email=current_user.email,
            return_url=f"{FRONTEND_URL}/account?paypal=success&plan={body.plan}",
            cancel_url=f"{FRONTEND_URL}/account?paypal=cancelled",
        )
    except PayPalBillingError as e:
        raise HTTPException(502, str(e))


@router.post('/paypal/confirm')
async def paypal_confirm(
    body: PayPalConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Called when the buyer returns from PayPal: read the subscription back and activate it."""
    try:
        subscription = await paypal_billing.get_subscription(body.subscription_id)
    except PayPalBillingError as e:
        raise HTTPException(502, str(e))

    # The subscription must have been started by this organisation
    if subscription.get('custom_id') != str(current_user.organization_id):
        raise HTTPException(403, 'This subscription belongs to another account')

    org = await _org_for(current_user, db)
    plan = paypal_billing.apply_subscription(org, subscription)
    if plan in paypal_billing.PLAN_NAMES:
        await db.commit()
        logger.info(f"Organization {org.id} upgraded to {plan} via PayPal subscription {subscription['id']}")
        return {'plan': plan, 'status': 'active'}
    # APPROVED but not yet ACTIVE: PayPal activates it shortly and the webhook will apply it
    return {'plan': org.plan, 'status': subscription.get('status', 'UNKNOWN').lower()}


@router.post('/paypal/cancel')
async def paypal_cancel(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _org_for(current_user, db)
    if org.billing_provider != 'paypal' or not org.paypal_subscription_id:
        raise HTTPException(400, 'No active PayPal subscription')
    try:
        await paypal_billing.cancel_subscription(org.paypal_subscription_id)
    except PayPalBillingError as e:
        raise HTTPException(502, str(e))
    paypal_billing.apply_subscription(org, {'id': org.paypal_subscription_id, 'status': 'CANCELLED'})
    await db.commit()
    return {'plan': org.plan}
