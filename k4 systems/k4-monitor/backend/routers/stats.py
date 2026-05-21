from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import Device, AlertIncident
from schemas import StatsOut

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsOut)
async def get_stats(db: AsyncSession = Depends(get_db)):
    devices = (await db.execute(select(Device))).scalars().all()

    counts = {"up": 0, "down": 0, "warning": 0, "unknown": 0}
    for d in devices:
        counts[d.status] = counts.get(d.status, 0) + 1

    active_incidents = (
        await db.execute(
            select(func.count()).where(AlertIncident.resolved == False)  # noqa: E712
        )
    ).scalar_one()

    return StatsOut(
        total_devices=len(devices),
        up=counts["up"],
        down=counts["down"],
        warning=counts["warning"],
        unknown=counts["unknown"],
        active_incidents=active_incidents,
    )
