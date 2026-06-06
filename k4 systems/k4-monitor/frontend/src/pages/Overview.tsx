import { Activity, CheckCircle2, XCircle, AlertTriangle, BellRing } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Stats, Device, AlertIncident } from "../api/client";

interface Props {
  stats: Stats | null;
  devices: Device[];
  incidents: AlertIncident[];
}

export function Overview({ stats, devices, incidents }: Props) {
  const recentEvents = [...devices]
    .filter((d) => d.last_check)
    .sort((a, b) => new Date(b.last_check!).getTime() - new Date(a.last_check!).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
        <p className="text-slate-500 text-sm mt-1">Estado atual da infraestrutura monitorada</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Total de Dispositivos" value={stats?.total_devices ?? 0} icon={<Activity size={22} />} />
        <StatCard label="Online" value={stats?.up ?? 0} color="text-emerald-400" icon={<CheckCircle2 size={22} className="text-emerald-500" />} />
        <StatCard label="Offline" value={stats?.down ?? 0} color="text-red-400" icon={<XCircle size={22} className="text-red-500" />} />
        <StatCard label="Alertas" value={stats?.warning ?? 0} color="text-amber-400" icon={<AlertTriangle size={22} className="text-amber-500" />} />
        <StatCard label="Incidentes Ativos" value={stats?.active_incidents ?? 0} color="text-red-400" icon={<BellRing size={22} className="text-red-500" />} />
        <StatCard
          label="Disponibilidade"
          value={stats && stats.total_devices > 0 ? `${Math.round((stats.up / stats.total_devices) * 100)}%` : "—"}
          color="text-indigo-400"
          icon={<Activity size={22} className="text-indigo-500" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent polls */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Últimas Verificações</h2>
          <div className="space-y-2">
            {recentEvents.length === 0 && (
              <p className="text-slate-600 text-sm text-center py-4">Nenhum dispositivo monitorado ainda</p>
            )}
            {recentEvents.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={d.status} />
                  <div>
                    <p className="text-sm text-white font-medium">{d.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{d.host}</p>
                  </div>
                </div>
                <div className="text-right">
                  {d.last_value !== null && (
                    <p className="text-sm font-mono text-slate-300">{d.last_value.toFixed(1)} ms</p>
                  )}
                  <p className="text-xs text-slate-600">
                    {d.last_check ? format(new Date(d.last_check), "HH:mm:ss", { locale: ptBR }) : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active incidents */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Incidentes Ativos</h2>
          <div className="space-y-2">
            {incidents.length === 0 && (
              <p className="text-slate-600 text-sm text-center py-4">Nenhum incidente ativo</p>
            )}
            {incidents.slice(0, 8).map((inc) => (
              <div key={inc.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                inc.severity === "critical" ? "bg-red-500/5 border-red-500/20" :
                inc.severity === "warning" ? "bg-amber-500/5 border-amber-500/20" :
                "bg-slate-500/5 border-slate-500/20"
              }`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 animate-pulse ${
                  inc.severity === "critical" ? "bg-red-400" :
                  inc.severity === "warning" ? "bg-amber-400" : "bg-slate-400"
                }`} />
                <div>
                  <p className="text-sm text-white">{inc.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {format(new Date(inc.fired_at), "dd/MM HH:mm", { locale: ptBR })}
                    {inc.acknowledged && " · Reconhecido"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
