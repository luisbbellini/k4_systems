import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { getMetrics, type Metric } from "../api/client";

interface Props {
  deviceId: number;
  metricName: string;
  color?: string;
  unit?: string;
}

export function MetricsChart({ deviceId, metricName, color = "#6366f1", unit = "" }: Props) {
  const [data, setData] = useState<{ t: string; v: number }[]>([]);

  useEffect(() => {
    getMetrics(deviceId, metricName, 6).then((metrics: Metric[]) => {
      setData(
        metrics.map((m) => ({
          t: format(new Date(m.timestamp), "HH:mm"),
          v: parseFloat(m.value.toFixed(2)),
        }))
      );
    });
  }, [deviceId, metricName]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
        Aguardando dados...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${deviceId}-${metricName}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: color }}
          formatter={(v: number) => [`${v}${unit}`, metricName]}
        />
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${deviceId}-${metricName})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
