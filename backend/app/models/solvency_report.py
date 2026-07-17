from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING, Any

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.user import User


class SolvencyReport(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "solvency_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="PENDING",
        server_default="PENDING",
        comment="PENDING | GENERATING | COMPLETED | FAILED",
    )
    report_type: Mapped[str] = mapped_column(
        sa.String(20), nullable=False, default="FULL", server_default="FULL"
    )
    report_data: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        default=None,
    )
    generated_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    document_uri: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
        comment="GCS object key or URI for the generated PDF",
    )
    share_token: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        unique=True,
        index=True,
    )
    share_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa.sql.false(),
    )
    share_expires_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    pdf_unlocked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=sa.sql.false(),
    )
    pdf_unlocked_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(
        sa.String(255),
        nullable=True,
        default=None,
    )

    # ── Score history columns ─────────────────────────────────────────────────
    overall_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        default=None,
        comment="Extracted from report_data for fast querying",
    )
    rating: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
        comment="APPROVE | REVIEW | DECLINE or Strong | Developing | At Risk",
    )
    generated_month: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
        comment="Format: YYYY-MM e.g. 2026-06",
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(
        "User",
        back_populates="solvency_reports",
        lazy="selectin",
    )
    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="solvency_reports",
        lazy="selectin",
    )
