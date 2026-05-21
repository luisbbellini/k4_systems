import httpx
import time


async def check_http(host: str, path: str = "/", expected_code: int = 200, use_https: bool = False, timeout: int = 10) -> dict:
    scheme = "https" if use_https else "http"
    url = f"{scheme}://{host}{path}"

    start = time.monotonic()
    try:
        async with httpx.AsyncClient(verify=False, timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(url)
        elapsed_ms = (time.monotonic() - start) * 1000
        return {
            "response_ms": round(elapsed_ms, 2),
            "status_code": resp.status_code,
            "reachable": resp.status_code == expected_code,
        }
    except httpx.TimeoutException:
        return {"response_ms": None, "status_code": None, "reachable": False, "error": "timeout"}
    except Exception as e:
        return {"response_ms": None, "status_code": None, "reachable": False, "error": str(e)}
