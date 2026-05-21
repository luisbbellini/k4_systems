from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, timezone, timedelta
from database import get_db
from models import Metric
from schemas import MetricOut

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/{device_id}", response_model=list[MetricOut])
async def get_metrics(
    device_id: int,
    metric_name: str | None = None,
    hours: int = Query(default=6, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    q = select(Metric).where(Metric.device_id == device_id, Metric.timestamp >= since)
    if metric_name:
        q = q.where(Metric.metric_name == metric_name)
    q = q.order_by(Metric.timestamp.asc())
    result = await db.execute(q)
    return result.scalars().all()


@router.delete("/{device_id}", status_code=204)
async def clear_metrics(device_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(Metric).where(Metric.device_id == device_id))
    await db.commit()
