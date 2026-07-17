from __future__ import annotations

import os
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

    FRONTEND_URL: str = os.getenv(
        "FRONTEND_URL",
        "https://solvai-frontend-879357866699.europe-west1.run.app"
    )

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/solvai"

    # ── Redis / Celery ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production-super-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days

    # ── Encryption ────────────────────────────────────────────────────────────
    ENCRYPTION_KEY: str = "emjfFr1pAqyg28gVx6DNZbRCKjvMMpvFeqlXL9eoptk="

    # ── Google Gemini ─────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""

    # ── Stripe ────────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_TEST_SECRET_KEY: str = ""
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
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_SECRET: str = ""
    PAYPAL_ENV: str = "sandbox"  # sandbox or live
    PAYPAL_REDIRECT_URI: str = ""

@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
