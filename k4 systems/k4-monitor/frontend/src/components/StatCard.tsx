interface StatCardProps {
  label: string;
  value: number | string;
  color?: string;
  icon: React.ReactNode;
}

export function StatCard({ label, value, color = "text-white", icon }: StatCardProps) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
      </div>
    </div>
  );
}
