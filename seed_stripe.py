import os
import stripe
import random
from dotenv import load_dotenv

load_dotenv(".env")
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

if not stripe.api_key:
    print("STRIPE_SECRET_KEY not found in .env")
    exit(1)

print("Seeding Stripe test data...")

base_monthly = 2000
for i in range(50):
    amount_eur = random.randint(200, 1000)
    amount_cents = int(amount_eur * 100)
    try:
        charge = stripe.Charge.create(
            amount=amount_cents,
            currency="eur",
            source="tok_visa",
            description=f"Freelance Services {i}",
        )
        print(f"Created charge {charge.id} for {amount_eur:.2f} EUR")
    except Exception as e:
        print(f"Error creating charge: {e}")

print("Seeding complete.")
