from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, status, UploadFile, File
from fastapi.responses import RedirectResponse
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, encrypt_dict, decrypt_dict
from app.models.financial_data_source import FinancialDataSource
from app.models.user import User
from app.schemas.data_source import DataSourceConnectRequest, DataSourceResponse

from app.services.belvo_service import belvo_service
from app.services.paypal_service import paypal_service
from app.services.xero_service import XeroService
import secrets
import hashlib
xero_service = XeroService()
from app.services.invoice_upload_service import invoice_upload_service
from app.core.config import settings
from app.services.csv_service import CSVService
from fastapi import UploadFile, File, Form
import json
import uuid

csv_service = CSVService()
_upload_sessions = {}

router = APIRouter()

@router.delete("/{source_type}")
async def delete_data_source(
    source_type: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import delete
    source_type = source_type.upper()
    if source_type not in _VALID_TYPES:
        raise HTTPException(status_code=400, detail="Invalid source type")
    
    # Delete all instances of this source_type for the user (handles duplicates)
    await db.execute(
        delete(FinancialDataSource).where(
            FinancialDataSource.user_id == current_user.id,
            FinancialDataSource.type == source_type
        )
    )
    await db.commit()
    
    return {"message": f"Successfully deleted {source_type}"}

_VALID_TYPES = {"STRIPE", "XERO", "PAYPAL", "MANUAL_UPLOAD", "BELVO"}




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


@router.get(
    "/available-integrations",
    summary="Get available integrations dynamically based on configured credentials",
)
async def get_available_integrations():
    return {
        "xero": bool(settings.XERO_CLIENT_ID and settings.XERO_CLIENT_SECRET),
        "paypal": bool(settings.PAYPAL_CLIENT_ID and settings.PAYPAL_SECRET),
        "bank_account": bool(settings.BELVO_SECRET_ID and settings.BELVO_SECRET_PASSWORD),
    }


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
        await db.refresh(source)
        
        return DataSourceResponse.model_validate(source)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/connect/stripe", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED, summary="Connect Stripe and immediately fetch metrics")
async def connect_stripe(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataSourceResponse:
    import asyncio
    from app.services.stripe_service import fetch_stripe_metrics
    api_key = body.get("api_key") or body.get("connection_details", {}).get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key is required")

    try:
        loop = asyncio.get_event_loop()
        metrics = await loop.run_in_executor(
            None, lambda: fetch_stripe_metrics(api_key=api_key)
        )
        logger.info(
            f"Stripe connect: data_points={metrics.get('data_points')}, "
            f"monthly_months={len(metrics.get('monthly_revenue', []))}, "
            f"avg_monthly={metrics.get('avg_monthly')}"
        )
    except Exception as e:
        logger.error(f"Stripe connect error: {e}")
        raise HTTPException(status_code=502, detail=f"Stripe API error: {e}")

    monthly_series = [
        {"month": m["month"], "revenue": m["total"], "transactions": m["transaction_count"]}
        for m in metrics.get("monthly_revenue", [])
    ]

    # Delete any previous STRIPE source for this user to avoid duplicates
    from sqlalchemy import delete as sa_delete
    await db.execute(
        sa_delete(FinancialDataSource).where(
            FinancialDataSource.user_id == current_user.id,
            FinancialDataSource.type == "STRIPE",
        )
    )

    source = FinancialDataSource(
        id=uuid.uuid4(),
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        type="STRIPE",
        status="CONNECTED",
        connection_details={
            "encrypted_data": encrypt_dict({"api_key": api_key}),
            "records_count": metrics.get("data_points", 0),
            "monthly_revenue_series": monthly_series,
        },
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return DataSourceResponse.model_validate(source)


@router.post("/{source_id}/sync", response_model=DataSourceResponse, summary="Re-sync a Stripe data source")
async def sync_data_source(
    source_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataSourceResponse:
    """Trigger a fresh data pull for a connected Stripe source."""
    from app.services.stripe_service import fetch_stripe_metrics

    result = await db.execute(
        select(FinancialDataSource).where(
            FinancialDataSource.id == source_id,
            FinancialDataSource.user_id == current_user.id,
            FinancialDataSource.is_deleted.is_(False),
        )
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Data source not found")
    if source.type != "STRIPE":
        raise HTTPException(status_code=400, detail="Sync is only supported for STRIPE sources")

    encrypted = (source.connection_details or {}).get("encrypted_data")
    if not encrypted:
        raise HTTPException(status_code=400, detail="No API key stored for this source")

    try:
        import asyncio
        logger.info(f"SYNC: encrypted value is {encrypted}")
        creds = decrypt_dict(encrypted)
        logger.info(f"SYNC: creds from decrypt is {creds}")
        api_key = creds.get("api_key")
        logger.info(f"SYNC: api_key is {api_key}")
        if not api_key:
            raise ValueError("api_key missing from stored credentials")
        loop = asyncio.get_event_loop()
        metrics = await loop.run_in_executor(
            None, lambda: fetch_stripe_metrics(api_key=api_key)
        )
        logger.info(
            f"Stripe sync {source_id}: data_points={metrics.get('data_points')}, "
            f"months={len(metrics.get('monthly_revenue', []))}"
        )
    except Exception as e:
        logger.error(f"Stripe sync error for source {source_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Stripe sync failed: {e}")

    monthly_series = [
        {"month": m["month"], "revenue": m["total"], "transactions": m["transaction_count"]}
        for m in metrics.get("monthly_revenue", [])
    ]

    source.connection_details = {
        **source.connection_details,
        "records_count": metrics.get("data_points", 0),
        "monthly_revenue_series": monthly_series,
    }
    await db.commit()
    await db.refresh(source)
    return DataSourceResponse.model_validate(source)


@router.get("/paypal/connect", summary="Start PayPal OAuth2 flow")
async def paypal_auth(current_user: User = Depends(get_current_user)):
    api_base = getattr(settings, "API_BASE_URL", "http://localhost:8000")
    redirect_uri = getattr(settings, "PAYPAL_REDIRECT_URI", f"{api_base.rstrip('/')}/api/v1/data-sources/paypal/callback")
    state = str(current_user.id)
    return {"url": paypal_service.get_auth_url(redirect_uri=redirect_uri, state=state)}

@router.get("/paypal/callback", summary="PayPal OAuth2 callback")
async def paypal_callback(
    code: str,
    state: str = "",
    db: AsyncSession = Depends(get_db),
):
    from loguru import logger
    frontend_url = settings.FRONTEND_URL
    api_base = getattr(settings, "API_BASE_URL", "http://localhost:8000")
    redirect_uri = getattr(settings, "PAYPAL_REDIRECT_URI", f"{api_base.rstrip('/')}/api/v1/data-sources/paypal/callback")
    
    try:
        try:
            user_id = uuid.UUID(state)
        except ValueError:
            raise Exception("Invalid state parameter")

        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        if not user:
            raise Exception("User not found from state")

        token_data = await paypal_service.get_access_token(code, redirect_uri)
        access_token = token_data.get("access_token")
        if not access_token:
            raise Exception("Failed to get PayPal access token")

        transactions = await paypal_service.fetch_transactions(access_token)
        aggregated = paypal_service.aggregate_monthly(transactions)
        
        source = FinancialDataSource(
            id=uuid.uuid4(),
            user_id=user.id,
            organization_id=user.organization_id,
            type="PAYPAL",
            status="CONNECTED",
            connection_details={
                "encrypted_data": encrypt_dict({"access_token": access_token}),
                "records_count": len(transactions),
                "monthly_revenue_series": aggregated.get("monthly_revenue_series", []),
                "currency": aggregated.get("currency"),
                "total_revenue": aggregated.get("total_revenue"),
                "client_concentration": aggregated.get("client_concentration", [])
            },
        )
        db.add(source)
        await db.commit()
        return RedirectResponse(f"{frontend_url}/data-sources?connected=paypal")
    except Exception as e:
        logger.error(f"PayPal callback error: {e}")
        return RedirectResponse(f"{frontend_url}/data-sources?error=paypal_failed")

@router.post("/upload", summary="Upload manual statements (CSV) for preview")
async def upload_statements(
    file: UploadFile = File(...),
):
    content = await file.read()
    filename = file.filename.lower() if file.filename else ""
    
    if not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    try:
        transactions = csv_service.parse_file(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    total_rows = len(transactions)
    preview_rows = transactions[:10]
    total_income = sum(t["amount"] for t in transactions if t.get("amount", 0) > 0)
    
    date_range = []
    dates = [t["date"] for t in transactions if t.get("date")]
    if dates:
        date_range = [min(dates), max(dates)]
        
    upload_token = str(uuid.uuid4())
    _upload_sessions[upload_token] = {
        "filename": filename,
        "transactions": transactions,
        "total_rows": total_rows,
        "total_income": total_income,
    }
    
    return {
        "preview_rows": preview_rows,
        "detected_columns": {"date": "Date", "amount": "Amount", "client": "Client"},
        "total_rows": total_rows,
        "date_range": date_range,
        "total_income_detected": total_income,
        "upload_token": upload_token
    }

@router.post("/upload/confirm", summary="Confirm invoice upload")
async def confirm_upload(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    upload_token = body.get("upload_token")
    if not upload_token or upload_token not in _upload_sessions:
        raise HTTPException(status_code=400, detail="Upload token is missing or invalid")
        
    session_data = _upload_sessions.pop(upload_token)
    transactions = session_data["transactions"]

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
        
        amt = float(t.get("amount", 0.0))
        if amt > 0:
            monthly_series[month]["revenue"] += amt
        monthly_series[month]["transactions"] += 1
        
    series_list = sorted(list(monthly_series.values()), key=lambda x: x["month"])
    
    source = FinancialDataSource(
        id=uuid.uuid4(),
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        type="MANUAL_UPLOAD",
        status="CONNECTED",
        connection_details={
            "filename": session_data["filename"],
            "records_count": session_data["total_rows"],
            "monthly_revenue_series": series_list
        },
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    
    return DataSourceResponse.model_validate(source)

@router.get("/xero/connect", summary="Start Xero OAuth2 flow")
async def xero_connect(current_user: User = Depends(get_current_user)):
    api_base = getattr(settings, "API_BASE_URL", "http://localhost:8000")
    redirect_uri = getattr(settings, "XERO_REDIRECT_URI", f"{api_base.rstrip('/')}/api/v1/data-sources/xero/callback")
    state = str(current_user.id)
    url = xero_service.get_auth_url(redirect_uri=redirect_uri, state=state)
    return {"url": url}

@router.get("/xero/callback", summary="Xero OAuth2 callback")
async def xero_callback(
    code: str,
    state: str = "",
    db: AsyncSession = Depends(get_db),
):
    from loguru import logger
    frontend_url = settings.FRONTEND_URL
    api_base = getattr(settings, "API_BASE_URL", "http://localhost:8000")
    redirect_uri = getattr(settings, "XERO_REDIRECT_URI", f"{api_base.rstrip('/')}/api/v1/data-sources/xero/callback")
    
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
        refresh_token = token_data.get("refresh_token", "")
        tenant_id = await xero_service.get_tenant_id(access_token)
        invoices = await xero_service.fetch_invoices(access_token, tenant_id)
        
        series_list, currency, platform, total_revenue, client_concentration = xero_service.aggregate_monthly(invoices)
        
        source = FinancialDataSource(
            id=uuid.uuid4(),
            user_id=user.id,
            organization_id=user.organization_id,
            type="XERO",
            status="CONNECTED",
            has_refresh_token=True,
            connection_details={
                "encrypted_data": encrypt_dict({"access_token": access_token, "refresh_token": refresh_token, "tenant_id": tenant_id}),
                "records_count": len(invoices),
                "monthly_revenue_series": series_list,
                "currency": currency,
                "platform": platform,
                "total_revenue": total_revenue,
                "client_concentration": client_concentration
            },
        )
        db.add(source)
        await db.commit()
        monthly_count = len(series_list)
        return RedirectResponse(f"{frontend_url}/data-sources?xero=connected&months={monthly_count}")
    except Exception as e:
        logger.error(f"Xero callback error: {e}")
        return RedirectResponse(f"{frontend_url}/data-sources?xero=error")


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
    await db.refresh(source)

    return DataSourceResponse.model_validate(source)
