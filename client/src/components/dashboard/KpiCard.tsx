interface KpiCardProps {
  label: string;
  value: string | number;
  accent?: string;
}

export default function KpiCard({ label, value, accent = "text-slate-100" }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
