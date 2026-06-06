from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from database import get_db
from models import AlertRule, AlertIncident
from schemas import AlertRuleCreate, AlertRuleOut, AlertIncidentOut

router = APIRouter(prefix="/alerts", tags=["alerts"])


# ── Rules ─────────────────────────────────────────────────────────────────────

@router.get("/rules", response_model=list[AlertRuleOut])
async def list_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertRule))
    return result.scalars().all()


@router.post("/rules", response_model=AlertRuleOut, status_code=201)
async def create_rule(payload: AlertRuleCreate, db: AsyncSession = Depends(get_db)):
    rule = AlertRule(**payload.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.commit()


# ── Incidents ─────────────────────────────────────────────────────────────────

@router.get("/incidents", response_model=list[AlertIncidentOut])
async def list_incidents(
    resolved: bool = False,
    db: AsyncSession = Depends(get_db),
):
    q = select(AlertIncident).where(AlertIncident.resolved == resolved).order_by(AlertIncident.fired_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/incidents/{incident_id}/acknowledge", response_model=AlertIncidentOut)
async def acknowledge(incident_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertIncident).where(AlertIncident.id == incident_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc.acknowledged = True
    await db.commit()
    await db.refresh(inc)
    return inc


@router.post("/incidents/{incident_id}/resolve", response_model=AlertIncidentOut)
async def resolve(incident_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertIncident).where(AlertIncident.id == incident_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc.resolved = True
    inc.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(inc)
    return inc
