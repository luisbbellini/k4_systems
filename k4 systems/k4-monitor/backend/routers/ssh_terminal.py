"""WebSocket SSH terminal proxy — browser ↔ FastAPI ↔ asyncssh ↔ device."""
import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Device
from collectors.ssh_executor import SSHSession, run_command

logger = logging.getLogger("k4monitor.ssh")
router = APIRouter(prefix="/ssh", tags=["ssh"])


# ── REST: test connectivity ──────────────────────────────────────────────────

@router.post("/test/{device_id}")
async def test_ssh(device_id: int, db: AsyncSession = Depends(get_db)):
    device = await _get_device(db, device_id)
    result = await run_command(
        host=device.host,
        username=device.ssh_username,
        password=device.ssh_password,
        key_path=device.ssh_key_path,
        port=device.ssh_port,
        command="echo k4monitor_ok",
        timeout=8,
    )
    return {
        "ok": result["ok"] and "k4monitor_ok" in result["stdout"],
        "stdout": result["stdout"],
        "stderr": result["stderr"],
    }


# ── REST: run a single command ───────────────────────────────────────────────

@router.post("/exec/{device_id}")
async def exec_command(device_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    device = await _get_device(db, device_id)
    command = body.get("command", "")
    if not command:
        raise HTTPException(status_code=400, detail="command is required")
    result = await run_command(
        host=device.host,
        username=device.ssh_username,
        password=device.ssh_password,
        key_path=device.ssh_key_path,
        port=device.ssh_port,
        command=command,
    )
    return result


# ── WebSocket: interactive PTY terminal ─────────────────────────────────────

@router.websocket("/terminal/{device_id}")
async def ssh_terminal(ws: WebSocket, device_id: int):
    await ws.accept()

    # Fetch device from DB without DI (WebSocket doesn't support Depends cleanly)
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Device).where(Device.id == device_id))
        device = result.scalar_one_or_none()

    if not device:
        await ws.send_text(json.dumps({"type": "error", "data": "Device not found"}))
        await ws.close()
        return

    if not device.ssh_enabled:
        await ws.send_text(json.dumps({"type": "error", "data": "SSH not enabled for this device"}))
        await ws.close()
        return

    session = SSHSession(
        host=device.host,
        username=device.ssh_username,
        password=device.ssh_password,
        key_path=device.ssh_key_path,
        port=device.ssh_port,
    )

    try:
        await ws.send_text(json.dumps({"type": "status", "data": f"Conectando a {device.host}..."}))
        await session.connect()
        await ws.send_text(json.dumps({"type": "status", "data": "connected"}))
    except Exception as e:
        await ws.send_text(json.dumps({"type": "error", "data": f"Falha na conexão: {e}"}))
        await ws.close()
        return

    # Read SSH → WebSocket
    async def ssh_to_ws():
        while True:
            chunk = await session.read_chunk()
            if chunk is None:
                await ws.send_text(json.dumps({"type": "disconnect", "data": "Sessão encerrada pelo dispositivo."}))
                break
            await ws.send_bytes(chunk)

    # WebSocket → SSH
    async def ws_to_ssh():
        while True:
            try:
                msg = await ws.receive()
            except WebSocketDisconnect:
                break
            if "bytes" in msg and msg["bytes"]:
                await session.write(msg["bytes"])
            elif "text" in msg and msg["text"]:
                try:
                    obj = json.loads(msg["text"])
                    if obj.get("type") == "resize":
                        session.resize(obj["cols"], obj["rows"])
                except Exception:
                    await session.write(msg["text"].encode())

    try:
        await asyncio.gather(ssh_to_ws(), ws_to_ssh())
    finally:
        await session.close()


async def _get_device(db: AsyncSession, device_id: int) -> Device:
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    if not device.ssh_enabled:
        raise HTTPException(status_code=400, detail="SSH not enabled for this device")
    return device
