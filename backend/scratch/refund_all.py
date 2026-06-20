import sys
import os
import time
sys.path.append(os.path.abspath('.'))
import stripe

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
print("Fetching all charges to refund...")
has_more = True
starting_after = None
count = 0
while has_more:
    kwargs = {"limit": 100}
    if starting_after: kwargs["starting_after"] = starting_after
    
    charges = stripe.Charge.list(**kwargs)
    for c in charges.data:
        if c.status == "succeeded" and c.paid and not c.refunded:
            try:
                stripe.Refund.create(charge=c.id)
                count += 1
                if count % 10 == 0:
                    print(f"Refunded {count} charges...")
            except Exception as e:
                print(f"Error refunding {c.id}: {e}")
    
    has_more = charges.has_more
    if has_more and len(charges.data) > 0:
        starting_after = charges.data[-1].id

print(f"Done. Refunded {count} charges total.")
