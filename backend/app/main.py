from __future__ import annotations

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.api import auth, data_sources, lender_matching, organizations, solvency_reports, users, webhooks, ws_terminal

# ── Loguru configuration ──────────────────────────────────────────────────────
# Remove default handler and add a clean one
logger.remove()
logger.add(
    sys.stdout,
    colorize=True,
    format=(
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    ),
    level="INFO",
)


class _InterceptHandler(logging.Handler):
    """Redirect standard library logging to Loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno  # type: ignore[assignment]

        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back  # type: ignore[assignment]
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


# Intercept uvicorn / sqlalchemy logs
for _name in ("uvicorn", "uvicorn.error", "uvicorn.access", "sqlalchemy.engine"):
    _log = logging.getLogger(_name)
    _log.handlers = [_InterceptHandler()]
    _log.propagate = False

# ── FastAPI application ───────────────────────────────────────────────────────
app = FastAPI(
    title="SolvAI API",
    version="0.1.0",
    description=(
        "AI-powered solvency reporting & lender matching platform for EU/UK freelancers."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ── CORS middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(data_sources.router, prefix="/data-sources", tags=["Data Sources"])
app.include_router(solvency_reports.router, prefix="/solvency-reports", tags=["Solvency Reports"])
app.include_router(lender_matching.router, prefix="/lender-matching", tags=["Lender Matching"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
app.include_router(ws_terminal.router, prefix="/ws/terminal", tags=["WebSockets Terminal"])


# ── Lifecycle events ──────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup() -> None:
    logger.info("🚀 SolvAI API starting up – version 0.1.0")
    logger.info(f"CORS origins: {settings.CORS_ORIGINS}")
    logger.info(f"Gemini configured: {bool(settings.GEMINI_API_KEY)}")
    logger.info(f"Resend configured: {bool(settings.RESEND_API_KEY)}")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logger.info("SolvAI API shutting down")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Health check endpoint")
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}
