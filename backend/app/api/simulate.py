"""What-if simulator: the user's verified metrics recomputed under hypothetical changes.

It replaces a simulator that asked the model to invent a score from typed-in
numbers. This one starts from the connected data and only does arithmetic.
"""
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.financial_data_source import FinancialDataSource
from app.models.user import User
from app.services.quant_service import simulate_scenario

router = APIRouter()


class WhatIfRequest(BaseModel):
    revenue_change_percent: float = Field(0.0, ge=-50, le=50)
    smoothing_percent: float = Field(0.0, ge=0, le=100)
    top_client_percent: float | None = Field(None, ge=5, le=100)


@router.post("/simulate/what-if", summary="Recompute the verified metrics under hypothetical changes")
async def what_if(
    body: WhatIfRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.tasks.report_generation import _build_financial_summary

    sources = (await db.execute(
        select(FinancialDataSource).where(
            FinancialDataSource.user_id == current_user.id,
            FinancialDataSource.is_deleted.is_(False),
            FinancialDataSource.status == "CONNECTED",
        )
    )).scalars().all()
    if not sources:
        raise HTTPException(status_code=400, detail="Connect a data source to simulate changes to your own figures.")

    # The summary builder is synchronous (legacy sources may call Stripe)
    summary = await asyncio.get_running_loop().run_in_executor(None, _build_financial_summary, sources)
    if not summary.get("monthly_revenue_series"):
        raise HTTPException(status_code=400, detail="Your connected sources have no revenue history yet.")

    result = simulate_scenario(summary, body.revenue_change_percent, body.smoothing_percent, body.top_client_percent)
    return {**result, "platforms": summary.get("connected_platforms", [])}
