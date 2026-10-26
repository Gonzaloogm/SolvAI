from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, status, UploadFile, File
from fastapi.responses import RedirectResponse
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, encrypt_dict, decrypt_dict
from app.models.financial_data_source import FinancialDataSource
from app.models.user import User
from app.schemas.data_source import DataSourceConnectRequest, DataSourceResponse
from app.services.belvo_service import belvo_service
from app.services.csv_service import CSVService
from app.services.paypal_service import paypal_service
from app.services.xero_service import XeroService

xero_service = XeroService()
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
        "paypal": True,
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


@router.post("/{source_id}/sync", response_model=DataSourceResponse, summary="Re-sync a Stripe or PayPal data source")
async def sync_data_source(
    source_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataSourceResponse:
    """Trigger a fresh data pull for a connected Stripe or PayPal source."""
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
    if source.type not in ("STRIPE", "PAYPAL"):
        raise HTTPException(status_code=400, detail="Sync is only supported for STRIPE and PAYPAL sources")

    encrypted = (source.connection_details or {}).get("encrypted_data")
    if not encrypted:
        raise HTTPException(status_code=400, detail="No credentials stored for this source")

    provider = source.type.capitalize()
    try:
        import asyncio
        creds = decrypt_dict(encrypted)
        loop = asyncio.get_event_loop()
        if source.type == "PAYPAL":
            if not creds.get("client_id") or not creds.get("client_secret"):
                raise ValueError("client_id/client_secret missing from stored credentials")
            metrics = await loop.run_in_executor(
                None, lambda: paypal_service.fetch_metrics(creds["client_id"], creds["client_secret"])
            )
        else:
            api_key = creds.get("api_key")
            if not api_key:
                raise ValueError("api_key missing from stored credentials")
            metrics = await loop.run_in_executor(
                None, lambda: fetch_stripe_metrics(api_key=api_key)
            )
        logger.info(
            f"{provider} sync {source_id}: data_points={metrics.get('data_points')}, "
            f"months={len(metrics.get('monthly_revenue', []))}"
        )
    except Exception as e:
        logger.error(f"{provider} sync error for source {source_id}: {e}")
        raise HTTPException(status_code=502, detail=f"{provider} sync failed: {e}")

    if source.type == "PAYPAL":
        snapshot = _paypal_snapshot(metrics)
    else:
        snapshot = {
            "records_count": metrics.get("data_points", 0),
            "monthly_revenue_series": [
                {"month": m["month"], "revenue": m["total"], "transactions": m["transaction_count"]}
                for m in metrics.get("monthly_revenue", [])
            ],
        }
    source.connection_details = {**source.connection_details, **snapshot}
    await db.commit()
    await db.refresh(source)
    return DataSourceResponse.model_validate(source)


@router.post("/connect/paypal", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED, summary="Connect PayPal with REST app credentials and fetch transactions")
async def connect_paypal(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataSourceResponse:
    import asyncio
    from app.services.paypal_service import PayPalAPIError
    details = body.get("connection_details") or body
    client_id = (details.get("client_id") or "").strip()
    client_secret = (details.get("client_secret") or "").strip()
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="client_id and client_secret are required")

    try:
        loop = asyncio.get_event_loop()
        metrics = await loop.run_in_executor(
            None, lambda: paypal_service.fetch_metrics(client_id, client_secret)
        )
        logger.info(
            f"PayPal connect: data_points={metrics.get('data_points')}, "
            f"monthly_months={len(metrics.get('monthly_revenue', []))}, "
            f"avg_monthly={metrics.get('avg_monthly')}"
        )
    except PayPalAPIError as e:
        logger.error(f"PayPal connect error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    from sqlalchemy import delete as sa_delete
    await db.execute(
        sa_delete(FinancialDataSource).where(
            FinancialDataSource.user_id == current_user.id,
            FinancialDataSource.type == "PAYPAL",
        )
    )

    source = FinancialDataSource(
        id=uuid.uuid4(),
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        type="PAYPAL",
        status="CONNECTED",
        connection_details={
            "encrypted_data": encrypt_dict({"client_id": client_id, "client_secret": client_secret}),
            **_paypal_snapshot(metrics),
        },
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return DataSourceResponse.model_validate(source)


def _paypal_snapshot(metrics: dict) -> dict:
    return {
        "records_count": metrics.get("data_points", 0),
        "monthly_revenue_series": [
            {"month": m["month"], "revenue": m["total"], "transactions": m["transaction_count"]}
            for m in metrics.get("monthly_revenue", [])
        ],
        "currency": metrics.get("currency"),
        "client_concentration": metrics.get("client_concentration"),
    }

@router.post("/upload", summary="Upload a bank statement CSV for preview")
async def upload_statements(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload and preview a bank statement CSV."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in ("csv", "txt", "tsv"):
        raise HTTPException(
            400,
            f"Unsupported file type .{ext}. Please upload a CSV file."
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB)")
    if len(content) == 0:
        raise HTTPException(400, "File is empty")

    try:
        result = csv_service.parse_file(content, file.filename)
    except ValueError as e:
        raise HTTPException(422, {
            "error": str(e),
            "suggestion": (
                "Ensure your CSV has date and amount "
                "columns. Export from your bank's "
                "online portal as CSV."
            )
        })

    if not result["monthly_revenue_series"]:
        raise HTTPException(422, {
            "error": "No income transactions found",
            "suggestion": (
                "Only positive amounts are counted as "
                f"income. Detected columns: "
                f"{result['detected_columns']}"
            )
        })

    token = str(uuid.uuid4())
    _upload_sessions[token] = {
        "user_id": str(current_user.id),
        "org_id": str(current_user.organization_id),
        "data": result,
        "filename": file.filename,
    }

    return {
        "upload_token": token,
        "preview": result["preview"],
        "preview_rows": result["preview"],
        "detected_columns": result["detected_columns"],
        "total_rows": result["total_rows"],
        "income_rows": result["income_rows"],
        "date_range": result["date_range"],
        "total_income_detected": result["total_income"],
        "months_detected": len(result["monthly_revenue_series"]),
        "currency": result["currency"],
    }

@router.post("/upload/confirm", summary="Confirm and save a previewed CSV upload")
async def confirm_upload(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a previewed CSV as a data source."""
    upload_token = body.get("upload_token")
    if not upload_token or upload_token not in _upload_sessions:
        raise HTTPException(
            404,
            "Upload session not found. Please upload the file again."
        )

    session_data = _upload_sessions[upload_token]
    if session_data["user_id"] != str(current_user.id):
        raise HTTPException(403, "Unauthorized")

    data = session_data["data"]
    name = body.get("name", "Bank Statement")
    records = sum(
        m["transactions"]
        for m in data["monthly_revenue_series"]
    )

    # Check if a CSV/MANUAL_UPLOAD source already exists for this user
    existing = await db.execute(
        select(FinancialDataSource).where(
            FinancialDataSource.user_id == current_user.id,
            FinancialDataSource.type.in_(["CSV", "MANUAL_UPLOAD"]),
        )
    )
    source = existing.scalar_one_or_none()

    monthly_series = data["monthly_revenue_series"]

    if source:
        source.connection_details = {
            "filename": session_data["filename"],
            "records_count": records,
            "monthly_revenue_series": monthly_series,
            "currency": data.get("currency", "EUR"),
            "total_revenue": data.get("total_income", 0),
        }
        source.status = "CONNECTED"
        source.type = "MANUAL_UPLOAD"
    else:
        source = FinancialDataSource(
            id=uuid.uuid4(),
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            type="MANUAL_UPLOAD",
            status="CONNECTED",
            connection_details={
                "filename": session_data["filename"],
                "records_count": records,
                "monthly_revenue_series": monthly_series,
                "currency": data.get("currency", "EUR"),
                "total_revenue": data.get("total_income", 0),
            },
        )
        db.add(source)

    await db.commit()
    await db.refresh(source)
    del _upload_sessions[upload_token]

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
