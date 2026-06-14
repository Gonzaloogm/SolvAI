import sys
sys.path.append('.')

from app.services.stripe_service import get_raw_transactions
print(get_raw_transactions())
