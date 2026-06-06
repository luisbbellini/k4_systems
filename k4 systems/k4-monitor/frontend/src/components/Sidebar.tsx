import { LayoutDashboard, Server, BellRing, Settings, Radio } from "lucide-react";

const NAV = [
  { id: "overview", icon: <LayoutDashboard size={18} />, label: "Visão Geral" },
  { id: "devices", icon: <Server size={18} />, label: "Dispositivos" },
  { id: "alerts", icon: <BellRing size={18} />, label: "Alertas" },
  { id: "settings", icon: <Settings size={18} />, label: "Configurações" },
];

interface Props {
  active: string;
  onChange: (id: string) => void;
  wsConnected: boolean;
  incidentCount: number;
}

export function Sidebar({ active, onChange, wsConnected, incidentCount }: Props) {
  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 border-r border-white/5 bg-slate-900/50 backdrop-blur flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Radio size={16} className="text-indigo-400" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">K4 Monitor</p>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Sistema de Monitoramento</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              active === item.id
                ? "bg-indigo-500/15 text-indigo-300 font-medium"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            {item.icon}
            {item.label}
            {item.id === "alerts" && incidentCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {incidentCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* WS Status */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          {wsConnected ? "Tempo real ativo" : "Reconectando..."}
        </div>
      </div>
    </aside>
  );
}
