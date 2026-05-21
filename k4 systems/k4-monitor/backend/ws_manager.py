"""WebSocket connection manager for real-time metric push."""
import json
import asyncio
from fastapi import WebSocket

_connections: set[WebSocket] = set()


async def connect(ws: WebSocket):
    await ws.accept()
    _connections.add(ws)


def disconnect(ws: WebSocket):
    _connections.discard(ws)


async def broadcast(data: dict):
    if not _connections:
        return
    payload = json.dumps(data, default=str)
    dead = set()
    for ws in _connections:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)
    for ws in dead:
        _connections.discard(ws)
