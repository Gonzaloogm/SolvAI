from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, model_validator


class DataSourceConnectRequest(BaseModel):
    """Payload for connecting a new financial data source.

    The ``connection_details`` dict is provider-specific and may hold
    OAuth tokens, API keys, or file references.  It is stored as JSONB.
    """

    connection_details: dict[str, Any] = {}


# Credentials and the per-transaction ledger stay server-side
_PRIVATE_DETAILS = ("encrypted_data", "transactions", "client_revenue")


class DataSourceResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    user_id: uuid.UUID
    organization_id: uuid.UUID
    type: str
    status: str
    created_at: datetime
    updated_at: datetime

    # Fields surfaced from connection_details for the frontend
    name: str | None = None
    records_count: int | None = None
    config: dict[str, Any] | None = None

    @model_validator(mode="before")
    @classmethod
    def extract_connection_details(cls, data: Any) -> Any:
        """Flatten connection_details into top-level response fields."""
        # Handle both ORM objects and plain dicts
        if hasattr(data, "__dict__"):
            cd: dict = getattr(data, "connection_details", {}) or {}
            if "name" not in data.__dict__ or data.__dict__.get("name") is None:
                data.__dict__["name"] = cd.get("name") or cd.get("filename") or None
            if "records_count" not in data.__dict__ or data.__dict__.get("records_count") is None:
                data.__dict__["records_count"] = cd.get("records_count")
            if "config" not in data.__dict__ or data.__dict__.get("config") is None:
                data.__dict__["config"] = {k: v for k, v in cd.items() if k not in _PRIVATE_DETAILS}
        elif isinstance(data, dict):
            cd = data.get("connection_details") or {}
            data.setdefault("name", cd.get("name") or cd.get("filename") or None)
            data.setdefault("records_count", cd.get("records_count"))
            data.setdefault("config", {k: v for k, v in cd.items() if k not in _PRIVATE_DETAILS})
        return data
