import sys
import os
sys.path.append(os.path.abspath('.'))
from app.services.stripe_service import get_raw_transactions
from datetime import datetime, timezone

txs = get_raw_transactions(months=1, api_key=os.environ.get("STRIPE_SECRET_KEY"))
print(f"Total last month: {len(txs)}")
for t in txs[:5]:
    print(t['description'], datetime.fromtimestamp(t['created'], timezone.utc))
