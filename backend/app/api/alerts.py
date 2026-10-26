from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.alert import Alert
from app.schemas.alert import AlertResponse

router = APIRouter()

@router.get(
    "/",
    response_model=List[AlertResponse],
    summary="List alerts for current user",
)
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert)
        .where(Alert.user_id == current_user.id)
        .order_by(desc(Alert.created_at))
    )
    return result.scalars().all()

@router.patch(
    "/{alert_id}/read",
    response_model=AlertResponse,
    summary="Mark alert as read",
)
async def mark_read(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_read = True
    await db.flush()
    return alert

@router.patch(
    "/read-all",
    summary="Mark all alerts as read",
)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.user_id == current_user.id, Alert.is_read == False)
    )
    alerts = result.scalars().all()
    for alert in alerts:
        alert.is_read = True
    await db.flush()
    return {"success": True}

@router.delete(
    "/{alert_id}",
    summary="Delete an alert",
)
async def delete_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await db.delete(alert)
    await db.flush()
    return {"success": True}

@router.post("/test")
async def create_test_alert(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.models.alert import Alert
    alert = Alert(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        type='SCORE_DROP',
        severity='warning',
        title='Test: Your score dropped 8 points',
        message='Your solvency score fell from 74 to 66. Main factor: client concentration increased to 52% of revenue.',
        metadata={'delta': -8, 'score': 66}
    )
    db.add(alert)
    await db.commit()
    return {"message": "Test alert created", "id": str(alert.id)}

