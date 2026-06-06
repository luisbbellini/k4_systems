"""Background polling engine — collects metrics for all enabled devices."""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from database import AsyncSessionLocal
from models import Device, Metric
from collectors.icmp import ping
from collectors.http_check import check_http
from collectors.snmp_check import check_snmp
from alert_engine import evaluate_alerts, evaluate_status_alert
from ws_manager import broadcast

logger = logging.getLogger("k4monitor.scheduler")

_tasks: dict[int, asyncio.Task] = {}


async def poll_device(device_id: int):
    """Poll a single device on its configured interval forever."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Device).where(Device.id == device_id))
                device = result.scalar_one_or_none()

                if device is None or not device.enabled:
                    return

                metrics = await _collect(device)
                await _save_metrics(db, device, metrics)
                await db.commit()

                await broadcast({
                    "event": "metrics",
                    "device_id": device.id,
                    "status": device.status,
                    "metrics": metrics,
                })

            await asyncio.sleep(device.check_interval)

        except asyncio.CancelledError:
            return
        except Exception as e:
            logger.error(f"Poll error device {device_id}: {e}")
            await asyncio.sleep(30)


async def _collect(device: Device) -> dict:
    check = device.check_type.lower()

    if check == "icmp":
        result = await ping(device.host)
        return {
            "latency_ms": result["latency_ms"],
            "packet_loss": result["packet_loss"],
            "reachable": result["reachable"],
        }
    elif check in ("http", "https"):
        result = await check_http(
            device.host,
            path=device.http_path,
            expected_code=device.http_expected_code,
            use_https=(check == "https"),
        )
        return {
            "response_ms": result["response_ms"],
            "status_code": result.get("status_code"),
            "reachable": result["reachable"],
        }
    elif check == "snmp":
        result = await check_snmp(device.host, community=device.snmp_community)
        return {
            "uptime_s": result["uptime_s"],
            "reachable": result["reachable"],
        }
    return {"reachable": False}


async def _save_metrics(db, device: Device, metrics: dict):
    now = datetime.now(timezone.utc)
    reachable = metrics.get("reachable", False)

    device.last_check = now
    device.status = "up" if reachable else "down"

    for name, value in metrics.items():
        if name == "reachable" or value is None:
            continue
        m = Metric(device_id=device.id, metric_name=name, value=float(value), timestamp=now)
        db.add(m)

        primary_value_keys = ["latency_ms", "response_ms", "uptime_s"]
        if name in primary_value_keys:
            device.last_value = float(value)

        await evaluate_alerts(db, device, name, float(value))

    await evaluate_status_alert(db, device, reachable)


def start_device(device_id: int):
    if device_id not in _tasks or _tasks[device_id].done():
        task = asyncio.create_task(poll_device(device_id), name=f"poll-{device_id}")
        _tasks[device_id] = task


def stop_device(device_id: int):
    task = _tasks.pop(device_id, None)
    if task and not task.done():
        task.cancel()


async def start_all():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Device).where(Device.enabled == True))  # noqa: E712
        devices = result.scalars().all()

    for device in devices:
        start_device(device.id)

    logger.info(f"Scheduler started {len(devices)} device pollers")
