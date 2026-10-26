from __future__ import annotations

import datetime
import uuid
from typing import TYPE_CHECKING, List

from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.financial_data_source import FinancialDataSource
    from app.models.solvency_report import SolvencyReport
    from app.models.user import User


class Organization(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Subscription ──────────────────────────────────────────────────────────
    stripe_customer_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    # "stripe" or "paypal": who bills the current paid plan
    billing_provider: Mapped[str | None] = mapped_column(Text, nullable=True)
    paypal_subscription_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    plan: Mapped[str] = mapped_column(Text, default="free", server_default="free", nullable=False)
    status: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_period_end: Mapped[datetime.datetime | None] = mapped_column(nullable=True)

    # ── Freemium: individually unlocked PDF reports ───────────────────────────
    # Stores a list of report UUIDs (as strings) that were unlocked via
    # a one-time 9€ payment.  Pro subscribers bypass this check entirely.
    unlocked_report_ids: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default="'[]'::jsonb",
        comment="Array of report UUID strings unlocked via one-time purchase",
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="organization",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    financial_data_sources: Mapped[List["FinancialDataSource"]] = relationship(
        "FinancialDataSource",
        back_populates="organization",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    solvency_reports: Mapped[List["SolvencyReport"]] = relationship(
        "SolvencyReport",
        back_populates="organization",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
