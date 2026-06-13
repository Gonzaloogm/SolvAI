from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.financial_data_source import FinancialDataSource
    from app.models.organization import Organization
    from app.models.solvency_report import SolvencyReport


class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    organization: Mapped["Organization"] = relationship(
        "Organization",
        back_populates="users",
        lazy="selectin",
    )
    financial_data_sources: Mapped[List["FinancialDataSource"]] = relationship(
        "FinancialDataSource",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    solvency_reports: Mapped[List["SolvencyReport"]] = relationship(
        "SolvencyReport",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
