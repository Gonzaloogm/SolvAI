from __future__ import annotations

import uuid
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from app.core.database import Base
from app.models.base import TimestampMixin, SoftDeleteMixin

class LenderManifest(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "lender_manifests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    risk_tier: Mapped[str] = mapped_column(String, nullable=False)
    raw_criteria: Mapped[dict] = mapped_column(JSONB, nullable=False)
    embedding = mapped_column(Vector(768))
