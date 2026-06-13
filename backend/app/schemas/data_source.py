from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class DataSourceConnectRequest(BaseModel):
    """Payload for connecting a new financial data source.

    The ``connection_details`` dict is provider-specific and may hold
    OAuth tokens, API keys, or file references.  It is stored as JSONB.
    """

    connection_details: dict[str, Any] = {}


class DataSourceResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    organization_id: uuid.UUID
    type: str
    status: str
    created_at: datetime
    updated_at: datetime
