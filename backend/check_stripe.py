import sys
import os
sys.path.append(os.path.abspath('.'))
from app.services.stripe_service import get_raw_transactions
from collections import defaultdict
from datetime import datetime, timezone

try:
    txs = get_raw_transactions(months=12, api_key=os.environ.get("STRIPE_SECRET_KEY"))
    counts = defaultdict(int)
    for t in txs:
        dt = datetime.fromtimestamp(t['created'], timezone.utc)
        counts[dt.strftime("%Y-%m")] += 1
    
    for k in sorted(counts.keys()):
        print(f"{k}: {counts[k]} transactions")
except Exception as e:
    print(f"Error: {e}")
