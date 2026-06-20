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

    logger.info("Seeding synthetic data for exactly 12 months with realistic constraints...")

    now = datetime.now(timezone.utc)
    
    # Target average ~6700 EUR per month for 12 months => ~80,400 EUR total
    # We'll generate transactions month by month to control the distribution.
    
    # 10 distinct clients
    # Top client (client1) gets ~30% of transactions/revenue
    clients = [f"client{i}@example.com" for i in range(1, 11)]
    weights = [0.30] + [0.70 / 9] * 9

    # Generate dates within the last 360 days to strictly fit in a 12-month window
    # starting from the beginning of the month 11 months ago to avoid spanning 13 months.
    
    start_date = (now.replace(day=1) - timedelta(days=330)).replace(day=1)
    if start_date < now - timedelta(days=360):
        start_date = now - timedelta(days=350)
        
    transactions_to_create = []
    
    for month_offset in range(12):
        # Base monthly revenue around 6700, with some volatility (e.g., 4000 to 9500)
        monthly_target = random.randint(4000, 9500)
        
        current_month_date = start_date + timedelta(days=30 * month_offset)
        
        # Determine number of transactions for this month (e.g. 5 to 12)
        num_tx = random.randint(5, 12)
        
        for _ in range(num_tx):
            # Assign client based on weights
            client = random.choices(clients, weights=weights, k=1)[0]
            
            # Random date within the month
            tx_date = current_month_date + timedelta(days=random.randint(0, 27))
            if tx_date > now:
                tx_date = now
                
            amount_cents = int((monthly_target / num_tx) * 100 * random.uniform(0.8, 1.2))
            
            transactions_to_create.append({
                "amount": amount_cents,
                "created": int(tx_date.timestamp()),
                "email": client
            })
            
    # Shuffle transactions
    random.shuffle(transactions_to_create)
    
    for i, tx in enumerate(transactions_to_create):
        logger.info(f"Creating charge for €{tx['amount']/100:.2f} ({datetime.fromtimestamp(tx['created'], timezone.utc).strftime('%Y-%m-%d')})...")
        
        try:
            charge = stripe.Charge.create(
                amount=tx["amount"],
                currency="eur",
                source="tok_visa",
                description=f"Synthetic Freelance Invoice #{i+1}",
                receipt_email=tx["email"],
                metadata={"historical_created": str(tx["created"])},
                capture=True,
            )
            # Occasional refund (very rare, 1%)
            if random.random() < 0.01:
                logger.info(f"Refunding charge {charge.id}...")
                stripe.Refund.create(charge=charge.id)
                
        except Exception as e:
            logger.error(f"Failed to create charge: {e}")

    logger.info("Seeding complete.")

if __name__ == "__main__":
    seed_stripe()
