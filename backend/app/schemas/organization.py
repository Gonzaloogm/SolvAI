from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class OrganizationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    created_at: datetime
    updated_at: datetime


class OrganizationUpdate(BaseModel):
    name: str | None = None
