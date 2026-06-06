import { useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Device } from "../api/client";
import { DeviceCard } from "../components/DeviceCard";
import { AddDeviceModal } from "../components/AddDeviceModal";

interface Props {
  devices: Device[];
  onRefresh: () => void;
}

export function Devices({ devices, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = devices.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.host.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dispositivos</h1>
          <p className="text-slate-500 text-sm mt-1">{devices.length} dispositivo{devices.length !== 1 ? "s" : ""} cadastrado{devices.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-8 w-full"
            placeholder="Buscar por nome ou IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {["all", "up", "down", "unknown"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-2 rounded-lg text-sm transition-all ${
              filterStatus === s ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-white/5 text-slate-400 border border-white/5 hover:text-white"
            }`}
          >
            {s === "all" ? "Todos" : s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-600">
            {devices.length === 0
              ? "Nenhum dispositivo ainda. Clique em Adicionar para começar."
              : "Nenhum dispositivo encontrado com os filtros selecionados."}
          </div>
        )}
        {filtered.map((device) => (
          <DeviceCard key={device.id} device={device} onDelete={onRefresh} />
        ))}
      </div>

      {showModal && (
        <AddDeviceModal
          onClose={() => setShowModal(false)}
          onCreated={onRefresh}
        />
      )}
    </div>
  );
}
