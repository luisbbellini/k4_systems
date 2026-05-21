import { useState } from "react";
import { CheckCheck, Eye, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AlertIncident, AlertRule, Device } from "../api/client";
import {
  acknowledgeIncident, resolveIncident,
  createAlertRule, deleteAlertRule,
} from "../api/client";

interface Props {
  incidents: AlertIncident[];
  rules: AlertRule[];
  devices: Device[];
  onRefresh: () => void;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/30 text-red-400",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

export function Alerts({ incidents, rules, devices, onRefresh }: Props) {
  const [tab, setTab] = useState<"incidents" | "rules">("incidents");
  const [showResolved, setShowResolved] = useState(false);
  const [newRule, setNewRule] = useState({
    device_id: devices[0]?.id ?? 0,
    metric_name: "latency_ms",
    operator: "gt",
    threshold: 200,
    severity: "warning",
    message: "",
  });

  const shown = showResolved ? incidents : incidents.filter((i) => !i.resolved);

  const handleCreateRule = async () => {
    if (!newRule.device_id) return;
    await createAlertRule(newRule);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Alertas</h1>
        <p className="text-slate-500 text-sm mt-1">
          {incidents.filter((i) => !i.resolved).length} incidente{incidents.filter((i) => !i.resolved).length !== 1 ? "s" : ""} ativo{incidents.filter((i) => !i.resolved).length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
        {(["incidents", "rules"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t ? "bg-indigo-500/20 text-indigo-300" : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "incidents" ? "Incidentes" : "Regras"}
          </button>
        ))}
      </div>

      {tab === "incidents" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
              />
              Mostrar resolvidos
            </label>
          </div>

          {shown.length === 0 && (
            <div className="glass-card p-12 text-center text-slate-600">
              Nenhum incidente {showResolved ? "" : "ativo"}
            </div>
          )}

          <div className="space-y-3">
            {shown.map((inc) => (
              <div key={inc.id} className={`glass-card p-4 flex items-start gap-4 border ${SEVERITY_STYLE[inc.severity] ?? SEVERITY_STYLE.info}`}>
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${inc.resolved ? "bg-slate-500" : "animate-pulse"} ${
                  inc.severity === "critical" ? "bg-red-400" : inc.severity === "warning" ? "bg-amber-400" : "bg-blue-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{inc.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Disparado em {format(new Date(inc.fired_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    {inc.acknowledged && " · Reconhecido"}
                    {inc.resolved && inc.resolved_at && ` · Resolvido em ${format(new Date(inc.resolved_at), "HH:mm:ss")}`}
                  </p>
                </div>
                {!inc.resolved && (
                  <div className="flex gap-2">
                    {!inc.acknowledged && (
                      <button onClick={() => acknowledgeIncident(inc.id).then(onRefresh)} className="btn-ghost text-xs flex items-center gap-1">
                        <Eye size={12} /> Reconhecer
                      </button>
                    )}
                    <button onClick={() => resolveIncident(inc.id).then(onRefresh)} className="btn-ghost text-xs flex items-center gap-1 text-emerald-400">
                      <CheckCheck size={12} /> Resolver
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "rules" && (
        <div className="space-y-6">
          {/* New rule form */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Nova Regra</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label">Dispositivo</label>
                <select className="input" value={newRule.device_id} onChange={(e) => setNewRule((r) => ({ ...r, device_id: +e.target.value }))}>
                  {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Métrica</label>
                <select className="input" value={newRule.metric_name} onChange={(e) => setNewRule((r) => ({ ...r, metric_name: e.target.value }))}>
                  <option value="latency_ms">Latência (ms)</option>
                  <option value="packet_loss">Perda de pacotes (%)</option>
                  <option value="response_ms">Tempo HTTP (ms)</option>
                  <option value="uptime_s">Uptime (s)</option>
                  <option value="reachable">Acessível</option>
                </select>
              </div>
              <div>
                <label className="label">Operador</label>
                <select className="input" value={newRule.operator} onChange={(e) => setNewRule((r) => ({ ...r, operator: e.target.value }))}>
                  <option value="gt">Maior que</option>
                  <option value="gte">Maior ou igual</option>
                  <option value="lt">Menor que</option>
                  <option value="lte">Menor ou igual</option>
                  <option value="eq">Igual a</option>
                </select>
              </div>
              <div>
                <label className="label">Threshold</label>
                <input className="input font-mono" type="number" value={newRule.threshold} onChange={(e) => setNewRule((r) => ({ ...r, threshold: +e.target.value }))} />
              </div>
              <div>
                <label className="label">Severidade</label>
                <select className="input" value={newRule.severity} onChange={(e) => setNewRule((r) => ({ ...r, severity: e.target.value }))}>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="label">Mensagem (opcional)</label>
                <input className="input" value={newRule.message} onChange={(e) => setNewRule((r) => ({ ...r, message: e.target.value }))} placeholder="Latência crítica detectada" />
              </div>
            </div>
            <button onClick={handleCreateRule} className="btn-primary mt-4 flex items-center gap-2">
              <Plus size={14} /> Criar Regra
            </button>
          </div>

          {/* Existing rules */}
          <div className="space-y-3">
            {rules.map((rule) => {
              const device = devices.find((d) => d.id === rule.device_id);
              return (
                <div key={rule.id} className="glass-card p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {device?.name ?? `Device #${rule.device_id}`} — {rule.metric_name} {rule.operator} {rule.threshold}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Severidade: <span className={rule.severity === "critical" ? "text-red-400" : rule.severity === "warning" ? "text-amber-400" : "text-blue-400"}>{rule.severity}</span>
                    </p>
                  </div>
                  <button onClick={() => deleteAlertRule(rule.id).then(onRefresh)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
            {rules.length === 0 && (
              <p className="text-center text-slate-600 py-8">Nenhuma regra criada</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
