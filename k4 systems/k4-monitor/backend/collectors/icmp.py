import asyncio
import platform
import re


async def ping(host: str, count: int = 3, timeout: int = 5) -> dict:
    """Returns latency_ms (avg) and packet_loss (0-100)."""
    system = platform.system().lower()

    if system == "windows":
        cmd = ["ping", "-n", str(count), "-w", str(timeout * 1000), host]
    else:
        cmd = ["ping", "-c", str(count), "-W", str(timeout), host]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout + 5)
        output = stdout.decode(errors="replace")

        latency = _parse_latency(output, system)
        loss = _parse_loss(output, system)

        return {"latency_ms": latency, "packet_loss": loss, "reachable": loss < 100}
    except (asyncio.TimeoutError, FileNotFoundError, OSError):
        return {"latency_ms": None, "packet_loss": 100.0, "reachable": False}


def _parse_latency(output: str, system: str) -> float | None:
    # Linux/macOS: rtt min/avg/max/mdev = 1.234/2.345/3.456/0.123 ms
    m = re.search(r"(?:rtt|round-trip).*?=\s*[\d.]+/([\d.]+)", output)
    if m:
        return float(m.group(1))
    # Windows: Average = 2ms
    m = re.search(r"Average\s*=\s*([\d.]+)ms", output)
    if m:
        return float(m.group(1))
    # Fallback: single time=X ms
    m = re.search(r"time[=<]([\d.]+)\s*ms", output)
    if m:
        return float(m.group(1))
    return None


def _parse_loss(output: str, system: str) -> float:
    # Linux/macOS: 33% packet loss
    m = re.search(r"([\d.]+)%\s*packet loss", output)
    if m:
        return float(m.group(1))
    # Windows: (33% loss)
    m = re.search(r"\(([\d.]+)%\s*loss\)", output)
    if m:
        return float(m.group(1))
    return 0.0
