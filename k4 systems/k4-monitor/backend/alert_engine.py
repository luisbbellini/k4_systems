from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import AlertRule, AlertIncident, Device


OPERATORS = {
    "gt": lambda v, t: v > t,
    "gte": lambda v, t: v >= t,
    "lt": lambda v, t: v < t,
    "lte": lambda v, t: v <= t,
    "eq": lambda v, t: v == t,
}


async def evaluate_alerts(db: AsyncSession, device: Device, metric_name: str, value: float):
    rules_result = await db.execute(
        select(AlertRule).where(
            AlertRule.device_id == device.id,
            AlertRule.metric_name == metric_name,
            AlertRule.enabled == True,  # noqa: E712
        )
    )
    rules = rules_result.scalars().all()

    for rule in rules:
        op = OPERATORS.get(rule.operator)
        if op is None:
            continue

        if op(value, rule.threshold):
            # Check if there's already an active (unresolved) incident for this rule
            existing = await db.execute(
                select(AlertIncident).where(
                    AlertIncident.rule_id == rule.id,
                    AlertIncident.resolved == False,  # noqa: E712
                )
            )
            if existing.scalars().first() is None:
                msg = rule.message or (
                    f"{device.name}: {metric_name} is {value} "
                    f"({rule.operator} {rule.threshold})"
                )
                incident = AlertIncident(
                    rule_id=rule.id,
                    value=value,
                    message=msg,
                    severity=rule.severity,
                )
                db.add(incident)
        else:
            # Auto-resolve open incidents for this rule
            open_result = await db.execute(
                select(AlertIncident).where(
                    AlertIncident.rule_id == rule.id,
                    AlertIncident.resolved == False,  # noqa: E712
                )
            )
            for incident in open_result.scalars().all():
                incident.resolved = True
                incident.resolved_at = datetime.now(timezone.utc)

    await db.commit()


async def evaluate_status_alert(db: AsyncSession, device: Device, reachable: bool):
    """Fire or resolve a 'device down' alert based on reachability."""
    DOWN_RULE_METRIC = "reachable"

    rules_result = await db.execute(
        select(AlertRule).where(
            AlertRule.device_id == device.id,
            AlertRule.metric_name == DOWN_RULE_METRIC,
            AlertRule.enabled == True,  # noqa: E712
        )
    )
    rules = rules_result.scalars().all()

    for rule in rules:
        if not reachable:
            existing = await db.execute(
                select(AlertIncident).where(
                    AlertIncident.rule_id == rule.id,
                    AlertIncident.resolved == False,  # noqa: E712
                )
            )
            if existing.scalars().first() is None:
                incident = AlertIncident(
                    rule_id=rule.id,
                    value=0,
                    message=f"{device.name} ({device.host}) is DOWN",
                    severity=rule.severity,
                )
                db.add(incident)
        else:
            open_result = await db.execute(
                select(AlertIncident).where(
                    AlertIncident.rule_id == rule.id,
                    AlertIncident.resolved == False,  # noqa: E712
                )
            )
            for incident in open_result.scalars().all():
                incident.resolved = True
                incident.resolved_at = datetime.now(timezone.utc)

    await db.commit()
