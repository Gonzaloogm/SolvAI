from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import datetime

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.organization import Organization

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/create-checkout-session")
async def create_checkout_session(
    price_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Check current org
        result = await db.execute(select(Organization).where(Organization.id == current_user.organization_id))
        org = result.scalar_one_or_none()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Determine frontend URL
        # For a full implementation, this should come from env or request headers
        frontend_url = "http://localhost:5173" 
        
        session_args = {
            "payment_method_types": ["card"],
            "line_items": [{"price": price_id, "quantity": 1}],
            "mode": "subscription",
            "success_url": f"{frontend_url}/checkout/success",
            "cancel_url": f"{frontend_url}/pricing",
            "client_reference_id": str(org.id),
        }
        
        if org.stripe_customer_id:
            session_args["customer"] = org.stripe_customer_id
        else:
            session_args["customer_email"] = current_user.email
            
        checkout_session = stripe.checkout.Session.create(**session_args)
        return {"url": checkout_session.url}
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscription")
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Organization).where(Organization.id == current_user.organization_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
        
    return {
        "plan": org.plan,
        "status": org.status,
        "current_period_end": org.current_period_end
    }

@router.post("/create-portal-session")
async def create_portal_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Organization).where(Organization.id == current_user.organization_id))
    org = result.scalar_one_or_none()
    
    if not org or not org.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No active Stripe customer found")
        
    frontend_url = "http://localhost:5173/account"
    
    try:
        portal_session = stripe.billing_portal.Session.create(
            customer=org.stripe_customer_id,
            return_url=frontend_url,
        )
        return {"url": portal_session.url}
    except Exception as e:
        logger.error(f"Error creating portal session: {e}")
        raise HTTPException(status_code=500, detail=str(e))
