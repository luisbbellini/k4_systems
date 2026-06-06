from sqlalchemy import String, Float, Integer, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from database import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    host: Mapped[str] = mapped_column(String(256))
    type: Mapped[str] = mapped_column(String(64), default="host")  # host, router, switch, service
    check_type: Mapped[str] = mapped_column(String(32), default="icmp")  # icmp, http, https, snmp
    check_interval: Mapped[int] = mapped_column(Integer, default=60)  # seconds
    snmp_community: Mapped[str] = mapped_column(String(128), default="public")
    http_path: Mapped[str] = mapped_column(String(512), default="/")
    http_expected_code: Mapped[int] = mapped_column(Integer, default=200)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    tags: Mapped[str] = mapped_column(Text, default="")

    # SSH credentials
    ssh_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    ssh_port: Mapped[int] = mapped_column(Integer, default=22)
    ssh_username: Mapped[str] = mapped_column(String(128), default="admin")
    ssh_password: Mapped[str] = mapped_column(String(256), default="")
    ssh_key_path: Mapped[str] = mapped_column(String(512), default="")
    ssh_device_type: Mapped[str] = mapped_column(String(64), default="linux")  # linux, fortios, cisco_ios, ubnt

    status: Mapped[str] = mapped_column(String(16), default="unknown")  # up, down, unknown, warning
    last_check: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    metrics: Mapped[list["Metric"]] = relationship(back_populates="device", cascade="all, delete-orphan")
    alert_rules: Mapped[list["AlertRule"]] = relationship(back_populates="device", cascade="all, delete-orphan")


class Metric(Base):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"))
    metric_name: Mapped[str] = mapped_column(String(64))  # latency_ms, packet_loss, http_ms, uptime
    value: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    device: Mapped["Device"] = relationship(back_populates="metrics")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"))
    metric_name: Mapped[str] = mapped_column(String(64))
    operator: Mapped[str] = mapped_column(String(8))  # gt, lt, eq, gte, lte
    threshold: Mapped[float] = mapped_column(Float)
    severity: Mapped[str] = mapped_column(String(16), default="warning")  # info, warning, critical
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    message: Mapped[str] = mapped_column(Text, default="")

    device: Mapped["Device"] = relationship(back_populates="alert_rules")
    incidents: Mapped[list["AlertIncident"]] = relationship(back_populates="rule", cascade="all, delete-orphan")


class AlertIncident(Base):
    __tablename__ = "alert_incidents"

    id: Mapped[int] = mapped_column(primary_key=True)
    rule_id: Mapped[int] = mapped_column(ForeignKey("alert_rules.id"))
    value: Mapped[float] = mapped_column(Float)
    message: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(16))
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    fired_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    rule: Mapped["AlertRule"] = relationship(back_populates="incidents")
