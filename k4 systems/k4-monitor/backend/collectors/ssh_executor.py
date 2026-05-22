"""SSH executor — comando único e sessão PTY interativa."""
import asyncio
import asyncssh
from typing import AsyncGenerator


async def run_command(
    host: str,
    username: str,
    password: str = "",
    key_path: str = "",
    port: int = 22,
    command: str = "",
    timeout: int = 15,
) -> dict:
    """Execute a single command and return stdout/stderr/exit_status."""
    connect_kwargs = _build_connect_kwargs(host, username, password, key_path, port, timeout)
    try:
        async with asyncssh.connect(**connect_kwargs) as conn:
            result = await asyncio.wait_for(
                conn.run(command, term_type="xterm-256color"),
                timeout=timeout,
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_status": result.exit_status,
                "ok": result.exit_status == 0,
            }
    except asyncssh.PermissionDenied:
        return {"stdout": "", "stderr": "Autenticação falhou.", "exit_status": 1, "ok": False}
    except (asyncssh.ConnectionLost, TimeoutError, asyncio.TimeoutError):
        return {"stdout": "", "stderr": "Conexão perdida ou timeout.", "exit_status": 1, "ok": False}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_status": 1, "ok": False}


class SSHSession:
    """PTY session that bridges a WebSocket and an SSH connection."""

    def __init__(self, host: str, username: str, password: str = "",
                 key_path: str = "", port: int = 22, cols: int = 220, rows: int = 50):
        self.host = host
        self.username = username
        self.password = password
        self.key_path = key_path
        self.port = port
        self.cols = cols
        self.rows = rows
        self._conn: asyncssh.SSHClientConnection | None = None
        self._process: asyncssh.SSHClientProcess | None = None

    async def connect(self):
        kwargs = _build_connect_kwargs(self.host, self.username, self.password, self.key_path, self.port, timeout=10)
        self._conn = await asyncssh.connect(**kwargs)
        self._process = await self._conn.create_process(
            term_type="xterm-256color",
            term_size=(self.cols, self.rows),
            encoding=None,
        )

    async def read_chunk(self, size: int = 4096) -> bytes | None:
        """Read a chunk from the SSH stdout; returns None on EOF."""
        if self._process is None:
            return None
        try:
            data = await asyncio.wait_for(self._process.stdout.read(size), timeout=30)
            return data if data else None
        except (asyncio.TimeoutError, asyncssh.ConnectionLost):
            return None

    async def write(self, data: bytes):
        if self._process:
            self._process.stdin.write(data)

    def resize(self, cols: int, rows: int):
        if self._process:
            self._process.change_terminal_size(cols, rows)

    async def close(self):
        if self._process:
            try:
                self._process.close()
            except Exception:
                pass
        if self._conn:
            self._conn.close()


def _build_connect_kwargs(host, username, password, key_path, port, timeout) -> dict:
    kwargs: dict = {
        "host": host,
        "port": port,
        "username": username,
        "known_hosts": None,
        "connect_timeout": timeout,
    }
    if key_path:
        kwargs["client_keys"] = [key_path]
    elif password:
        kwargs["password"] = password
    return kwargs
