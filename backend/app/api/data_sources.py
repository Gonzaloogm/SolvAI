from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, status, UploadFile, File
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, encrypt_dict
from app.models.financial_data_source import FinancialDataSource
from app.models.user import User
from app.schemas.data_source import DataSourceConnectRequest, DataSourceResponse

from app.services.belvo_service import belvo_service
from app.services.paypal_service import paypal_service
from app.services.xero_service import xero_service
from app.services.invoice_upload_service import invoice_upload_service
from app.core.config import settings

router = APIRouter()

_VALID_TYPES = {"STRIPE", "XERO", "PAYPAL", "MANUAL_UPLOAD", "BELVO"}


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


@router.get("/belvo/institutions", summary="Get supported Belvo institutions")
async def get_belvo_institutions():
    return belvo_service.get_institutions()

@router.post("/connect/belvo", summary="Connect a Belvo bank link")
async def connect_belvo(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    link_id = body.get("link_id")
    institution = body.get("institution", "")
    if not link_id:
        raise HTTPException(status_code=400, detail="link_id is required")
    
    # Store the link_id encrypted as a data source
    source = FinancialDataSource(
        id=uuid.uuid4(),
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        type="BELVO",
        status="CONNECTED",
        connection_details={
            "encrypted_data": encrypt_dict({"link_id": link_id, "institution": institution})
        },
    )
    db.add(source)
    await db.flush()
    
    return DataSourceResponse.model_validate(source)

@router.post("/upload", summary="Upload CSV or PDF invoices")
async def upload_invoices(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    filename = file.filename.lower() if file.filename else ""
    
    if filename.endswith(".csv"):
        transactions = invoice_upload_service.parse_csv(content)
    elif filename.endswith(".pdf"):
        transactions = invoice_upload_service.parse_pdf(content)
    else:
        raise HTTPException(status_code=400, detail="Only CSV and PDF files are supported")
    
    return {
        "filename": file.filename,
        "transaction_count": len(transactions),
        "transactions": transactions,
        "message": "Review these transactions and confirm to add them to your profile"
    }

@router.get("/xero/auth", summary="Start Xero OAuth2 flow")
async def xero_auth():
    # Use the first CORS origin as the frontend url, or a default
    redirect_uri = "http://localhost:8000/api/v1/data-sources/xero/callback"
    return {"url": xero_service.get_auth_url(redirect_uri=redirect_uri)}

@router.get("/xero/callback", summary="Xero OAuth2 callback")
async def xero_callback(
    code: str,
    state: str = "",
):
    frontend_url = settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:5173"
    redirect_uri = "http://localhost:8000/api/v1/data-sources/xero/callback"
    try:
        token_data = await xero_service.exchange_code(code, redirect_uri)
        # We would typically store the token here, but we redirect as requested.
        return RedirectResponse(f"{frontend_url}/data-sources?connected=xero")
    except Exception as e:
        return RedirectResponse(f"{frontend_url}/data-sources?error=xero_failed")
