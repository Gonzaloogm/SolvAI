from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Public URL of the web app (links in e-mails, payment return URLs)
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/solvai"

    # ── Redis / Celery ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production-super-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days

    # ── Encryption ────────────────────────────────────────────────────────────
    # Fernet key for stored provider credentials. Required; generate with
    # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    ENCRYPTION_KEY: str = ""

    # ── Google Gemini ─────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    # Underwriter writes the report (3 parallel calls per draft): the quality model.
    GEMINI_UNDERWRITER_MODEL: str = "gemini-2.5-flash"
    # Auditor and score simulator: short structured answers. Lite models usually
    # get the largest free-tier quota; set both to gemini-3.5-flash-lite to run for free.
    GEMINI_LIGHT_MODEL: str = "gemini-3.5-flash-lite"

    # ── Stripe ────────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_API_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_BILLING_WEBHOOK_SECRET: str = ""
    STRIPE_PRO_PRICE_ID: str = ""
    STRIPE_BUSINESS_PRICE_ID: str = ""
    # One-time 9€ price ID used for per-report PDF unlocks
    STRIPE_REPORT_UNLOCK_PRICE_ID: str = ""

    # ── Xero ─────────────────────────────────────────────────────────────────
    XERO_CLIENT_ID: str = ""
    XERO_CLIENT_SECRET: str = ""
    XERO_REDIRECT_URI: str = ""
    XERO_WEBHOOK_KEY: str = ""

    # ── Email (Resend) ────────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""

    # ── GCP / Storage ─────────────────────────────────────────────────────────
    GCP_BUCKET_NAME: str = "solvai-documents-eu"

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── Admin / Beta Setup ────────────────────────────────────────────────────
    ADMIN_KEY: str = ""

    # ── Belvo (Open Banking) ───────────────────────────────────────────────────
    BELVO_SECRET_ID: str = ""
    BELVO_SECRET_PASSWORD: str = ""
    BELVO_ENV: str = "sandbox"  # sandbox or production

    # ── PayPal ────────────────────────────────────────────────────────────────
    # Users connect with their own REST app credentials; this only picks the API host
    PAYPAL_ENV: str = "sandbox"  # sandbox or live
    # SolvAI's own merchant app, used to bill Pro/Business through PayPal Subscriptions.
    # Must be a different account from any user's data source.
    PAYPAL_BILLING_CLIENT_ID: str = ""
    PAYPAL_BILLING_SECRET: str = ""
    PAYPAL_PRO_PLAN_ID: str = ""
    PAYPAL_BUSINESS_PLAN_ID: str = ""
    PAYPAL_WEBHOOK_ID: str = ""

    # ── Demo data ─────────────────────────────────────────────────────────────
    # Test-mode accounts any signed-in user can connect with one click ("Try with
    # demo data"). Real Stripe test charges and PayPal sandbox payments, never generated.
    DEMO_STRIPE_TEST_KEY: str = ""
    DEMO_PAYPAL_CLIENT_ID: str = ""
    DEMO_PAYPAL_SECRET: str = ""

@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
