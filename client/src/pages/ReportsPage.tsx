import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVehicleReports, fetchUtilization, downloadReportsCsv } from "../lib/reports";
import { fetchTrips } from "../lib/trips";
import { useAuthStore } from "../store/authStore";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export default function ReportsPage() {
  const role = useAuthStore((state) => state.user?.role);
  const canView = role === "FLEET_MANAGER" || role === "FINANCIAL_ANALYST";

  const vehiclesQuery = useQuery({
    queryKey: ["reports", "vehicles"],
    queryFn: fetchVehicleReports,
    enabled: canView,
  });
  const utilQuery = useQuery({
    queryKey: ["reports", "utilization"],
    queryFn: fetchUtilization,
    enabled: canView,
  });
  const tripsQuery = useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips,
    enabled: canView,
  });

  const [downloading, setDownloading] = useState(false);

  // Computed totals for KPIs
  const totalCost = useMemo(() => {
    if (!vehiclesQuery.data) return 0;
    return vehiclesQuery.data.reduce((sum, v) => sum + v.operationalCost, 0);
  }, [vehiclesQuery.data]);

  const avgEfficiency = useMemo(() => {
    if (!vehiclesQuery.data) return 0;
    let totalDist = 0;
    let totalFuel = 0;
    vehiclesQuery.data.forEach(v => {
      totalDist += v.totalDistance;
      totalFuel += v.totalFuelConsumed;
    });
    return totalFuel > 0 ? totalDist / totalFuel : 0;
  }, [vehiclesQuery.data]);

  const avgRoi = useMemo(() => {
    if (!vehiclesQuery.data || vehiclesQuery.data.length === 0) return 0;
    const sum = vehiclesQuery.data.reduce((acc, v) => acc + v.roi, 0);
    return sum / vehiclesQuery.data.length;
  }, [vehiclesQuery.data]);

  const topCostliest = useMemo(() => {
    if (!vehiclesQuery.data) return [];
    return [...vehiclesQuery.data]
      .sort((a, b) => b.operationalCost - a.operationalCost)
      .slice(0, 3);
  }, [vehiclesQuery.data]);

  const maxCost = topCostliest.length > 0 ? topCostliest[0].operationalCost : 1;

  // Monthly Revenue (Last 6 Months)
  const monthlyRevenue = useMemo(() => {
    const revByMonth = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      revByMonth.set(d.toLocaleString("en-US", { month: "short" }), 0);
    }

    if (tripsQuery.data) {
      tripsQuery.data
        .filter((t) => t.status === "COMPLETED" && t.completedAt)
        .forEach((t) => {
          const d = new Date(t.completedAt!);
          const month = d.toLocaleString("en-US", { month: "short" });
          if (revByMonth.has(month)) {
            revByMonth.set(month, revByMonth.get(month)! + t.revenue);
          }
        });
    }

    const data = Array.from(revByMonth.entries()).map(([month, rev]) => ({ month, rev }));
    return data;
  }, [tripsQuery.data]);

  if (!canView) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Reports</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Reports are available to Fleet Managers and Financial Analysts only.
        </p>
      </div>
    );
  }

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadReportsCsv();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reports &amp; Analytics</h1>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-5 py-2 rounded-[var(--radius)] bg-[var(--bg-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] disabled:opacity-60 text-[var(--text-primary)] text-sm font-bold transition-colors shadow-sm"
        >
          {downloading ? "Preparing…" : "Export Data"}
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] border-l-4 border-l-blue-500 shadow-sm flex flex-col justify-center min-h-[100px]">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest mb-1">Fuel Efficiency</div>
          <div className="text-3xl font-extrabold text-[var(--text-primary)]">{fmt(avgEfficiency)} <span className="text-lg font-medium text-[var(--text-secondary)]">km/l</span></div>
        </div>

        <div className="p-5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] border-l-4 border-l-green-500 shadow-sm flex flex-col justify-center min-h-[100px]">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest mb-1">Fleet Utilization</div>
          <div className="text-3xl font-extrabold text-[var(--text-primary)]">{utilQuery.data ? utilQuery.data.fleetUtilization : 0}%</div>
        </div>

        <div className="p-5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] border-l-4 border-l-[var(--brand-color)] shadow-sm flex flex-col justify-center min-h-[100px]">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest mb-1">Operational Cost</div>
          <div className="text-3xl font-extrabold text-[var(--text-primary)]">{totalCost.toLocaleString()}</div>
        </div>

        <div className="p-5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] border-l-4 border-l-red-500 shadow-sm flex flex-col justify-center min-h-[100px]">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest mb-1">Vehicle ROI</div>
          <div className="text-3xl font-extrabold text-[var(--text-primary)]">{(avgRoi * 100).toFixed(1)}%</div>
          <div className="text-[9px] text-[var(--text-secondary)] mt-1">ROI = (Revenue - (Maint + Fuel)) / Acq. Cost</div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left: Monthly Revenue Chart */}
        <div className="mb-8 lg:mb-0 h-[300px]">
          <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6">Monthly Revenue</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} tickFormatter={(value) => `$${value}`} />
              <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-primary)" }} />
              <Bar dataKey="rev" fill="#5C88C0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Top Costliest Vehicles */}
        <div className="h-[300px]">
          <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6">Top Costliest Vehicles</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCostliest} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="registrationNumber" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-secondary)", fontWeight: "bold" }} />
              <Tooltip cursor={{ fill: "transparent" }} formatter={(value: number) => [`$${value.toLocaleString()}`, "Cost"]} contentStyle={{ borderRadius: "8px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-primary)" }} />
              <Bar dataKey="operationalCost" radius={[0, 4, 4, 0]} barSize={24}>
                {topCostliest.map((entry, index) => {
                  const colors = ["#FF8888", "#D97706", "#5C88C0"];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
