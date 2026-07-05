import sys
sys.path.append('.')

from app.services.stripe_service import get_raw_transactions
if __name__ == "__main__":
    print(get_raw_transactions())
