from __future__ import annotations

import uuid
from typing import List

from pydantic import BaseModel


class LenderMatch(BaseModel):
    lender_name: str
    lender_type: str
    max_loan_amount: float
    interest_rate_min: float
    interest_rate_max: float
    criteria_met: List[str]
    apply_url: str


class LenderMatchingResponse(BaseModel):
    report_id: uuid.UUID
    score: int
    matches: List[LenderMatch]


class LenderManifestoCreate(BaseModel):
    name: str
    risk_tier: str
    raw_criteria: dict


class LenderManifestoResponse(BaseModel):
    id: uuid.UUID
    name: str
    status: str
