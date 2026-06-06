import { useState } from "react";
import { X } from "lucide-react";
import { createDevice } from "../api/client";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function AddDeviceModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    name: "",
    host: "",
    type: "host",
    check_type: "icmp",
    check_interval: 60,
    http_path: "/",
    http_expected_code: 200,
    snmp_community: "public",
    tags: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createDevice(form);
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Adicionar Dispositivo</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome">
            <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Servidor Web 01" />
          </Field>
          <Field label="Host / IP">
            <input className="input font-mono" required value={form.host} onChange={(e) => set("host", e.target.value)} placeholder="192.168.1.1 ou example.com" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tipo">
              <select className="input" value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="host">Host</option>
                <option value="router">Roteador</option>
                <option value="switch">Switch</option>
                <option value="service">Serviço</option>
              </select>
            </Field>
            <Field label="Protocolo">
              <select className="input" value={form.check_type} onChange={(e) => set("check_type", e.target.value)}>
                <option value="icmp">ICMP (Ping)</option>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="snmp">SNMP</option>
              </select>
            </Field>
          </div>

          {(form.check_type === "http" || form.check_type === "https") && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Path">
                <input className="input font-mono" value={form.http_path} onChange={(e) => set("http_path", e.target.value)} />
              </Field>
              <Field label="Código esperado">
                <input className="input font-mono" type="number" value={form.http_expected_code} onChange={(e) => set("http_expected_code", +e.target.value)} />
              </Field>
            </div>
          )}

          {form.check_type === "snmp" && (
            <Field label="Community">
              <input className="input font-mono" value={form.snmp_community} onChange={(e) => set("snmp_community", e.target.value)} />
            </Field>
          )}

          <Field label="Intervalo (segundos)">
            <input className="input font-mono" type="number" min={10} max={3600} value={form.check_interval} onChange={(e) => set("check_interval", +e.target.value)} />
          </Field>

          <Field label="Tags (separadas por vírgula)">
            <input className="input" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="prod, web, nginx" />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
