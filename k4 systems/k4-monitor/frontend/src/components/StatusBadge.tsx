const STATUS_COLORS: Record<string, string> = {
  up: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  down: "bg-red-500/20 text-red-400 border-red-500/30",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  unknown: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const STATUS_DOT: Record<string, string> = {
  up: "bg-emerald-400",
  down: "bg-red-400",
  warning: "bg-amber-400",
  unknown: "bg-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] ?? STATUS_COLORS.unknown}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] ?? STATUS_DOT.unknown} ${status === "down" ? "animate-pulse" : ""}`} />
      {status.toUpperCase()}
    </span>
  );
}
