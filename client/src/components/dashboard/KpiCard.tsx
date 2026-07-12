import { Card, CardContent } from "../ui/card";

interface KpiCardProps {
  label: string;
  value: string | number;
  accent?: string;
}

export default function KpiCard({ label, value, accent = "text-[var(--text-primary)]" }: KpiCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-[var(--border-color)] bg-[var(--bg-primary)] pt-6">
      <CardContent>
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{label}</div>
        <div className={`mt-3 text-4xl font-extrabold ${accent}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
