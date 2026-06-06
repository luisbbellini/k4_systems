const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Devices
export const getDevices = () => request<Device[]>("/devices");
export const createDevice = (data: Partial<Device>) =>
  request<Device>("/devices", { method: "POST", body: JSON.stringify(data) });
export const updateDevice = (id: number, data: Partial<Device>) =>
  request<Device>(`/devices/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deleteDevice = (id: number) =>
  request<void>(`/devices/${id}`, { method: "DELETE" });

// Metrics
export const getMetrics = (deviceId: number, metricName?: string, hours = 6) => {
  const q = new URLSearchParams({ hours: String(hours) });
  if (metricName) q.set("metric_name", metricName);
  return request<Metric[]>(`/metrics/${deviceId}?${q}`);
};

// Alerts
export const getAlertRules = () => request<AlertRule[]>("/alerts/rules");
export const createAlertRule = (data: Partial<AlertRule>) =>
  request<AlertRule>("/alerts/rules", { method: "POST", body: JSON.stringify(data) });
export const deleteAlertRule = (id: number) =>
  request<void>(`/alerts/rules/${id}`, { method: "DELETE" });
export const getIncidents = (resolved = false) =>
  request<AlertIncident[]>(`/alerts/incidents?resolved=${resolved}`);
export const acknowledgeIncident = (id: number) =>
  request<AlertIncident>(`/alerts/incidents/${id}/acknowledge`, { method: "POST" });
export const resolveIncident = (id: number) =>
  request<AlertIncident>(`/alerts/incidents/${id}/resolve`, { method: "POST" });

// Stats
export const getStats = () => request<Stats>("/stats");

// Types
export interface Device {
  id: number;
  name: string;
  host: string;
  type: string;
  check_type: string;
  check_interval: number;
  http_path: string;
  http_expected_code: number;
  enabled: boolean;
  tags: string;
  status: "up" | "down" | "warning" | "unknown";
  last_check: string | null;
  last_value: number | null;
  created_at: string;
}

export interface Metric {
  id: number;
  device_id: number;
  metric_name: string;
  value: number;
  timestamp: string;
}

export interface AlertRule {
  id: number;
  device_id: number;
  metric_name: string;
  operator: string;
  threshold: number;
  severity: string;
  enabled: boolean;
  message: string;
}

export interface AlertIncident {
  id: number;
  rule_id: number;
  value: number;
  message: string;
  severity: string;
  acknowledged: boolean;
  resolved: boolean;
  fired_at: string;
  resolved_at: string | null;
}

export interface Stats {
  total_devices: number;
  up: number;
  down: number;
  warning: number;
  unknown: number;
  active_incidents: number;
}
