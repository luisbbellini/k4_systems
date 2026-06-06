import { useState } from "react";
import { Wifi, Globe, Router, Server, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Device } from "../api/client";
import { StatusBadge } from "./StatusBadge";
import { MetricsChart } from "./MetricsChart";
import { deleteDevice } from "../api/client";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  host: <Server size={16} />,
  router: <Router size={16} />,
  switch: <Wifi size={16} />,
  service: <Globe size={16} />,
};

const CHECK_METRIC: Record<string, { name: string; color: string; unit: string }> = {
  icmp: { name: "latency_ms", color: "#6366f1", unit: " ms" },
  http: { name: "response_ms", color: "#22d3ee", unit: " ms" },
  https: { name: "response_ms", color: "#22d3ee", unit: " ms" },
  snmp: { name: "uptime_s", color: "#10b981", unit: " s" },
};

interface Props {
  device: Device;
  onDelete: () => void;
}

export function DeviceCard({ device, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const metric = CHECK_METRIC[device.check_type] ?? CHECK_METRIC.icmp;

  const handleDelete = async () => {
    if (!confirm(`Remover ${device.name}?`)) return;
    await deleteDevice(device.id);
    onDelete();
  };

  return (
    <div className={`glass-card p-4 transition-all duration-200 ${device.status === "down" ? "border-red-500/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            device.status === "up" ? "bg-emerald-500/10 text-emerald-400" :
            device.status === "down" ? "bg-red-500/10 text-red-400" :
            "bg-slate-500/10 text-slate-400"
          }`}>
            {TYPE_ICONS[device.type] ?? TYPE_ICONS.host}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{device.name}</p>
            <p className="text-xs text-slate-500 font-mono truncate">{device.host}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={device.status} />
          <button onClick={handleDelete} className="text-slate-600 hover:text-red-400 transition-colors p-1">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setExpanded((x) => !x)} className="text-slate-500 hover:text-slate-300 p-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span className="font-mono uppercase bg-slate-800 px-2 py-0.5 rounded">
          {device.check_type}
        </span>
        {device.last_value !== null && (
          <span className="font-mono text-slate-300">
            {device.last_value.toFixed(1)}{metric.unit}
          </span>
        )}
        {device.last_check && (
          <span>
            {format(new Date(device.last_check), "HH:mm:ss", { locale: ptBR })}
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">{metric.name}</p>
          <MetricsChart
            deviceId={device.id}
            metricName={metric.name}
            color={metric.color}
            unit={metric.unit}
          />
        </div>
      )}
    </div>
  );
}
