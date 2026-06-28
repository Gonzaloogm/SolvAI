import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AlertResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    organization_id: uuid.UUID
    type: str
    title: str
    message: str
    is_read: bool
    action_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
