import { Info, Github, Zap } from "lucide-react";

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Informações e configurações do sistema</p>
      </div>

      <div className="grid gap-4">
        <div className="glass-card p-6 flex items-start gap-4">
          <Info size={20} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white">K4 Monitor v1.0</h3>
            <p className="text-slate-400 text-sm mt-1">
              Sistema de monitoramento de dispositivos em rede desenvolvido como parte do ecossistema K4 Systems.
              Suporta ICMP (ping), HTTP/HTTPS e SNMP com alertas configuráveis e dados em tempo real via WebSocket.
            </p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-start gap-4">
          <Zap size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white">Protocolos Suportados</h3>
            <div className="mt-3 space-y-2 text-sm">
              {[
                ["ICMP (Ping)", "Latência e perda de pacotes via ping nativo do sistema"],
                ["HTTP / HTTPS", "Tempo de resposta e validação de código de status"],
                ["SNMP v2c", "Uptime e descritivo via OIDs padrão (sysUpTime, sysDescr)"],
              ].map(([name, desc]) => (
                <div key={name} className="flex items-start gap-3">
                  <span className="font-mono text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 flex-shrink-0">{name}</span>
                  <span className="text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-6 flex items-start gap-4">
          <Github size={20} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white">Stack Técnica</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {[
                ["Backend", "Python + FastAPI + SQLAlchemy"],
                ["Banco de dados", "SQLite (dev) / TimescaleDB (prod)"],
                ["Frontend", "React + TypeScript + Vite"],
                ["Gráficos", "Recharts"],
                ["Tempo real", "WebSockets nativos"],
                ["Scheduler", "AsyncIO tasks"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">{k}</p>
                  <p className="text-slate-200 font-mono text-xs mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
