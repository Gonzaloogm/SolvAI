import os
import sys
sys.path.append('.')
from dotenv import load_dotenv
load_dotenv()

from app.services.stripe_service import get_raw_transactions
print(get_raw_transactions())
