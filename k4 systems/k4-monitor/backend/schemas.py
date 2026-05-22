from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DeviceCreate(BaseModel):
    name: str
    host: str
    type: str = "host"
    check_type: str = "icmp"
    check_interval: int = 60
    snmp_community: str = "public"
    http_path: str = "/"
    http_expected_code: int = 200
    tags: str = ""
    ssh_enabled: bool = False
    ssh_port: int = 22
    ssh_username: str = "admin"
    ssh_password: str = ""
    ssh_key_path: str = ""
    ssh_device_type: str = "linux"


class DeviceUpdate(BaseModel):
    name: str | None = None
    host: str | None = None
    type: str | None = None
    check_type: str | None = None
    check_interval: int | None = None
    snmp_community: str | None = None
    http_path: str | None = None
    http_expected_code: int | None = None
    enabled: bool | None = None
    tags: str | None = None
    ssh_enabled: bool | None = None
    ssh_port: int | None = None
    ssh_username: str | None = None
    ssh_password: str | None = None
    ssh_key_path: str | None = None
    ssh_device_type: str | None = None


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    host: str
    type: str
    check_type: str
    check_interval: int
    http_path: str
    http_expected_code: int
    enabled: bool
    tags: str
    status: str
    last_check: datetime | None
    last_value: float | None
    created_at: datetime
    ssh_enabled: bool
    ssh_port: int
    ssh_username: str
    ssh_device_type: str


class MetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: int
    metric_name: str
    value: float
    timestamp: datetime


class AlertRuleCreate(BaseModel):
    device_id: int
    metric_name: str
    operator: str
    threshold: float
    severity: str = "warning"
    message: str = ""


class AlertRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: int
    metric_name: str
    operator: str
    threshold: float
    severity: str
    enabled: bool
    message: str


class AlertIncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rule_id: int
    value: float
    message: str
    severity: str
    acknowledged: bool
    resolved: bool
    fired_at: datetime
    resolved_at: datetime | None


class StatsOut(BaseModel):
    total_devices: int
    up: int
    down: int
    warning: int
    unknown: int
    active_incidents: int
