import stripe
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

codes = ["SOLVAI-FOUNDER", "HACKATHON2026", "BETA-ACCESS", "LANDLORD-PRO", "GESTOR-PRO"]

for code in codes:
    try:
        stripe.Coupon.create(
            duration="forever",
            percent_off=100.0,
            name=f"Free Pro Access ({code})",
            id=code
        )
        print(f"Created coupon: {code}")
    except stripe.error.InvalidRequestError as e:
        print(f"Error creating coupon {code}: {e}")
