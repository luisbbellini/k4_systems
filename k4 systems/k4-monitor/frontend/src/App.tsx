import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Overview } from "./pages/Overview";
import { Devices } from "./pages/Devices";
import { Alerts } from "./pages/Alerts";
import { Settings } from "./pages/Settings";
import { useWebSocket } from "./hooks/useWebSocket";
import { useApi } from "./hooks/useApi";
import {
  getDevices, getStats, getIncidents, getAlertRules,
  type Device,
} from "./api/client";

export default function App() {
  const [page, setPage] = useState("overview");
  const [wsConnected, setWsConnected] = useState(false);

  const { data: devices, reload: reloadDevices } = useApi(getDevices);
  const { data: stats, reload: reloadStats } = useApi(getStats);
  const { data: incidents, reload: reloadIncidents } = useApi(() => getIncidents(false));
  const { data: rules, reload: reloadRules } = useApi(getAlertRules);

  const reloadAll = useCallback(() => {
    reloadDevices();
    reloadStats();
    reloadIncidents();
    reloadRules();
  }, [reloadDevices, reloadStats, reloadIncidents, reloadRules]);

  // Poll stats every 30s
  useEffect(() => {
    const t = setInterval(reloadStats, 30_000);
    return () => clearInterval(t);
  }, [reloadStats]);

  useWebSocket((msg: unknown) => {
    const data = msg as { event: string; device_id?: number; status?: string };
    setWsConnected(true);
    if (data.event === "metrics") {
      // Update device status in-place without full reload
      reloadDevices();
      reloadStats();
    } else if (data.event === "incident") {
      reloadIncidents();
    }
  });

  const devList: Device[] = devices ?? [];
  const incList = incidents ?? [];
  const ruleList = rules ?? [];

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar
        active={page}
        onChange={setPage}
        wsConnected={wsConnected}
        incidentCount={incList.filter((i) => !i.resolved && !i.acknowledged).length}
      />

      <main className="flex-1 p-8 overflow-auto">
        {page === "overview" && (
          <Overview stats={stats} devices={devList} incidents={incList} />
        )}
        {page === "devices" && (
          <Devices devices={devList} onRefresh={reloadAll} />
        )}
        {page === "alerts" && (
          <Alerts incidents={incList} rules={ruleList} devices={devList} onRefresh={reloadAll} />
        )}
        {page === "settings" && <Settings />}
      </main>
    </div>
  );
}
