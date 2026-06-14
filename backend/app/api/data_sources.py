from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, encrypt_dict
from app.models.financial_data_source import FinancialDataSource
from app.models.user import User
from app.schemas.data_source import DataSourceConnectRequest, DataSourceResponse

router = APIRouter()

_VALID_TYPES = {"STRIPE", "XERO", "PAYPAL", "MANUAL_UPLOAD"}


@router.post(
    "/connect/{type}",
    response_model=DataSourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Connect a new financial data source",
)
async def connect_data_source(
    type: str = Path(
        ...,
        description="Provider type: STRIPE | XERO | PAYPAL | MANUAL_UPLOAD",
    ),
    body: DataSourceConnectRequest = DataSourceConnectRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataSourceResponse:
    provider = type.upper()
    if provider not in _VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown data source type '{type}'. "
                   f"Valid types: {', '.join(sorted(_VALID_TYPES))}",
        )

    source = FinancialDataSource(
        id=uuid.uuid4(),
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        type=provider,
        status="CONNECTED",
        connection_details={"encrypted_data": encrypt_dict(body.connection_details)},
    )
    db.add(source)
    await db.flush()

    return DataSourceResponse.model_validate(source)


@router.get(
    "/",
    response_model=List[DataSourceResponse],
    summary="List all connected data sources for the current user",
)
async def list_data_sources(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[DataSourceResponse]:
    result = await db.execute(
        select(FinancialDataSource).where(
            FinancialDataSource.user_id == current_user.id,
            FinancialDataSource.is_deleted.is_(False),
        )
    )
    sources = result.scalars().all()
    return [DataSourceResponse.model_validate(s) for s in sources]
