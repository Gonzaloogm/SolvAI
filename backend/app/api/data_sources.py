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
    institution = body.get("institution")
    username = body.get("username")
    password = body.get("password")
    
    if not institution or not username or not password:
        raise HTTPException(status_code=400, detail="institution, username, and password are required")
        
    try:
        link_id = await belvo_service.create_link(institution, username, password)
        transactions = await belvo_service.get_transactions(link_id)
        
        monthly_series = {}
        for t in transactions:
            d = t.get("date", "")
            month = d[:7] if len(d) >= 7 else "Unknown"
            if month not in monthly_series:
                monthly_series[month] = {"month": month, "revenue": 0.0, "transactions": 0}
            monthly_series[month]["revenue"] += t.get("amount", 0.0)
            monthly_series[month]["transactions"] += 1
            
        series_list = sorted(list(monthly_series.values()), key=lambda x: x["month"])
        
        # Store the link_id encrypted as a data source
        source = FinancialDataSource(
            id=uuid.uuid4(),
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            type="BELVO",
            status="CONNECTED",
            connection_details={
                "encrypted_data": encrypt_dict({"link_id": link_id, "institution": institution}),
                "records_count": len(transactions),
                "monthly_revenue_series": series_list
            },
        )
        db.add(source)
        await db.flush()
        
        return DataSourceResponse.model_validate(source)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/connect/paypal", summary="Connect PayPal using Client Credentials")
async def connect_paypal(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from loguru import logger
    from app.services.paypal_service import paypal_service
    try:
        transactions = await paypal_service.get_transactions()
        
        monthly_series = {}
        for t in transactions:
            d = t.get("date", "")
            month = d[:7] if len(d) >= 7 else "Unknown"
            if month not in monthly_series:
                monthly_series[month] = {"month": month, "revenue": 0.0, "transactions": 0}
            monthly_series[month]["revenue"] += t.get("amount", 0.0)
            monthly_series[month]["transactions"] += 1
            
        series_list = sorted(list(monthly_series.values()), key=lambda x: x["month"])
        
        source = FinancialDataSource(
            id=uuid.uuid4(),
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            type="PAYPAL",
            status="CONNECTED",
            connection_details={
                "encrypted_data": encrypt_dict({"paypal_client_credentials": True}),
                "records_count": len(transactions),
                "monthly_revenue_series": series_list
            },
        )
        db.add(source)
        await db.commit()
        return DataSourceResponse.model_validate(source)
    except Exception as e:
        logger.error(f"PayPal connect error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload", summary="Upload manual statements (CSV/PDF) for preview")
async def upload_statements(
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
    
    total_rows = len(transactions)
    preview_rows = transactions[:10]
    total_income = sum(t["amount"] for t in transactions)
    
    date_range = []
    dates = [t["date"] for t in transactions if t.get("date")]
    if dates:
        date_range = [min(dates), max(dates)]
        
    import re
    monthly_series = {}
    for t in transactions:
        d = t.get("date", "")
        month = "Unknown"
        m_iso = re.search(r"(\d{4})[\-\.](\d{2})", d)
        m_eu = re.search(r"(\d{2})[/\-\.](\d{2})[/\-\.](\d{4})", d)
        if m_iso:
            month = f"{m_iso.group(1)}-{m_iso.group(2)}"
        elif m_eu:
            month = f"{m_eu.group(3)}-{m_eu.group(2)}"
        
        if month not in monthly_series:
            monthly_series[month] = {"month": month, "revenue": 0.0, "transactions": 0}
        monthly_series[month]["revenue"] += t.get("amount", 0.0)
        monthly_series[month]["transactions"] += 1
        
    series_list = sorted(list(monthly_series.values()), key=lambda x: x["month"])
    
    source = FinancialDataSource(
        id=uuid.uuid4(),
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        type="MANUAL_UPLOAD",
        status="PENDING",
        connection_details={
            "filename": filename,
            "records_count": total_rows,
            "monthly_revenue_series": series_list
        },
    )
    db.add(source)
    await db.commit()
    
    return {
        "preview_rows": preview_rows,
        "detected_columns": {"date": "Date", "amount": "Amount", "currency": "Currency", "client": "Client"},
        "total_rows": total_rows,
        "date_range": date_range,
        "total_income_detected": total_income,
        "upload_token": str(source.id)
    }

@router.post("/upload/confirm", summary="Confirm invoice upload")
async def confirm_upload(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    upload_token = body.get("upload_token")
    if not upload_token:
        raise HTTPException(status_code=400, detail="upload_token is required")
        
    try:
        source_uuid = uuid.UUID(upload_token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid token")

    result = await db.execute(
        select(FinancialDataSource).where(
            FinancialDataSource.id == source_uuid,
            FinancialDataSource.user_id == current_user.id
        )
    )
    source = result.scalars().first()
    if not source:
        raise HTTPException(status_code=404, detail="Upload not found")
        
    source.status = "CONNECTED"
    await db.commit()
    
    return DataSourceResponse.model_validate(source)

@router.get("/xero/auth", summary="Start Xero OAuth2 flow")
async def xero_auth(current_user: User = Depends(get_current_user)):
    api_base = getattr(settings, "API_BASE_URL", "http://localhost:8000")
    redirect_uri = f"{api_base.rstrip('/')}/api/v1/data-sources/xero/callback"
    state = str(current_user.id)
    return {"url": xero_service.get_auth_url(redirect_uri=redirect_uri, state=state)}

@router.get("/xero/callback", summary="Xero OAuth2 callback")
async def xero_callback(
    code: str,
    state: str = "",
    db: AsyncSession = Depends(get_db),
):
    from loguru import logger
    frontend_url = settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:5173"
    api_base = getattr(settings, "API_BASE_URL", "http://localhost:8000")
    redirect_uri = f"{api_base.rstrip('/')}/api/v1/data-sources/xero/callback"
    
    try:
        try:
            user_id = uuid.UUID(state)
        except ValueError:
            raise Exception("Invalid state parameter")

        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        if not user:
            raise Exception("User not found from state")

        token_data = await xero_service.exchange_code(code, redirect_uri)
        access_token = token_data["access_token"]
        tenant_id = await xero_service.get_tenant_id(access_token)
        invoices = await xero_service.get_paid_invoices(access_token, tenant_id)
        
        monthly_series = {}
        for inv in invoices:
            d = inv.get("date", "")
            month = d[:7] if len(d) >= 7 else "Unknown"
            if month not in monthly_series:
                monthly_series[month] = {"month": month, "revenue": 0.0, "transactions": 0}
            monthly_series[month]["revenue"] += inv.get("amount", 0.0)
            monthly_series[month]["transactions"] += 1
            
        series_list = sorted(list(monthly_series.values()), key=lambda x: x["month"])
        
        source = FinancialDataSource(
            id=uuid.uuid4(),
            user_id=user.id,
            organization_id=user.organization_id,
            type="XERO",
            status="CONNECTED",
            connection_details={
                "encrypted_data": encrypt_dict({"access_token": access_token, "tenant_id": tenant_id}),
                "records_count": len(invoices),
                "monthly_revenue_series": series_list
            },
        )
        db.add(source)
        await db.commit()
        return RedirectResponse(f"{frontend_url}/data-sources?connected=xero")
    except Exception as e:
        logger.error(f"Xero callback error: {e}")
        return RedirectResponse(f"{frontend_url}/data-sources?error=xero_failed")
