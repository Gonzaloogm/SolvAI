"""Test settings are injected before `app` is imported anywhere."""
import os

from cryptography.fernet import Fernet

os.environ.setdefault("ENCRYPTION_KEY", Fernet.generate_key().decode())
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("PAYPAL_ENV", "sandbox")
os.environ.setdefault("XERO_WEBHOOK_KEY", "test-xero-key")
