"""Basic SNMP v2c checks — uptime and interface info."""
import asyncio


async def check_snmp(host: str, community: str = "public", timeout: int = 5) -> dict:
    """
    Poll standard OIDs:
      sysUpTime  .1.3.6.1.2.1.1.3.0
      sysDescr   .1.3.6.1.2.1.1.1.0
    Returns uptime in seconds (hundredths → seconds).
    """
    try:
        from pysnmp.hlapi.v3arch.asyncio import (
            get_cmd, SnmpEngine, CommunityData, UdpTransportTarget,
            ContextData, ObjectType, ObjectIdentity,
        )

        engine = SnmpEngine()
        iterator = get_cmd(
            engine,
            CommunityData(community, mpModel=1),
            await UdpTransportTarget.create((host, 161), timeout=timeout, retries=1),
            ContextData(),
            ObjectType(ObjectIdentity("1.3.6.1.2.1.1.3.0")),  # sysUpTime
            ObjectType(ObjectIdentity("1.3.6.1.2.1.1.1.0")),  # sysDescr
        )

        error_indication, error_status, _, var_binds = await iterator

        if error_indication or error_status:
            return {"reachable": False, "uptime_s": None, "descr": None}

        uptime_hundredths = int(var_binds[0][1])
        descr = str(var_binds[1][1])

        return {
            "reachable": True,
            "uptime_s": uptime_hundredths // 100,
            "descr": descr[:256],
        }

    except ImportError:
        return {"reachable": False, "uptime_s": None, "descr": "pysnmp not available"}
    except Exception as e:
        return {"reachable": False, "uptime_s": None, "descr": str(e)}


async def _run_snmp_with_timeout(coro, timeout: int):
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        return {"reachable": False, "uptime_s": None, "descr": "timeout"}
