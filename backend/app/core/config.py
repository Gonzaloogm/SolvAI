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

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/solvai"

    # ── Redis / Celery ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production-super-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days

    # ── Google Gemini ─────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""

    # ── Stripe ────────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_TEST_SECRET_KEY: str = ""

    # ── Xero ─────────────────────────────────────────────────────────────────
    XERO_CLIENT_ID: str = ""
    XERO_CLIENT_SECRET: str = ""

    # ── Email (Resend) ────────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""

    # ── AWS / S3 ──────────────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "solvai-documents"
    AWS_REGION: str = "eu-west-1"

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
