import os
from dotenv import load_dotenv
import stripe
import time

load_dotenv()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

try:
    charge = stripe.Charge.create(
        amount=2000,
        currency="eur",
        source="tok_visa",
        description="Test created date",
        created=int(time.time()) - 86400 * 30 # 1 month ago
    )
    print("Created charge:", charge.id, "created:", charge.created)
except Exception as e:
    print("Error:", e)
