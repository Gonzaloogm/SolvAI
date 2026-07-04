from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class OrganizationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    plan: str
    status: str | None = None


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    organization_id: uuid.UUID
    email: str
    organization: OrganizationResponse | None = None
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    email: EmailStr | None = None
