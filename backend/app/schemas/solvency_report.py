from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class SolvencyReportCreateRequest(BaseModel):
    """No required fields – the report is built from the user's connected data sources."""
    report_type: str = "FULL"


class SolvencyReportResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    organization_id: uuid.UUID
    status: str
    report_type: str = "FULL"
    report_data: dict[str, Any] | None = None
    generated_at: datetime | None = None
    pdf_unlocked: bool = False
    created_at: datetime
    updated_at: datetime
