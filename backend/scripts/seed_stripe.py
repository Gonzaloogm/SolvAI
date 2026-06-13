import os
import sys
import random
from datetime import datetime, timedelta, timezone

# Add parent directory to path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import stripe
from app.core.config import settings
from loguru import logger

def seed_stripe():
    if not settings.STRIPE_SECRET_KEY:
        logger.error("STRIPE_SECRET_KEY is not set. Cannot seed data.")
        return
    
    if not settings.STRIPE_SECRET_KEY.startswith("sk_test_"):
        logger.error("Only test keys (sk_test_...) are allowed for seeding.")
        return

    stripe.api_key = settings.STRIPE_SECRET_KEY

    logger.info("Checking if Stripe account already has recent charges...")
    try:
        recent_charges = stripe.Charge.list(limit=1)
        if len(recent_charges.data) > 0:
            logger.info("Found existing charges. Skipping seeding to prevent duplicates.")
            return
    except Exception as e:
        logger.error(f"Error communicating with Stripe: {e}")
        return

    logger.info("No recent charges found. Seeding synthetic data...")

    now = datetime.now(timezone.utc)
    
    # Generate around 40 transactions over the last 6 months
    num_transactions = 40
    
    for i in range(num_transactions):
        # Random date within the last 180 days
        days_ago = random.randint(1, 180)
        created_time = int((now - timedelta(days=days_ago)).timestamp())
        
        # Random amount between 500 and 4000 euros
        amount_cents = random.randint(50000, 400000)
        
        logger.info(f"Creating charge for €{amount_cents/100:.2f} ({days_ago} days ago)...")
        
        try:
            # In test mode, we can use a test token like 'tok_visa'
            charge = stripe.Charge.create(
                amount=amount_cents,
                currency="eur",
                source="tok_visa",
                description=f"Synthetic Freelance Invoice #{i+1}",
                capture=True,
            )
            
            # Occasionally refund (about 5% chance)
            if random.random() < 0.05:
                logger.info(f"Refunding charge {charge.id}...")
                stripe.Refund.create(charge=charge.id)
                
        except Exception as e:
            logger.error(f"Failed to create charge: {e}")

    logger.info("Seeding complete.")

if __name__ == "__main__":
    seed_stripe()
