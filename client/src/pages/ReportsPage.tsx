import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVehicleReports, fetchUtilization, downloadReportsCsv } from "../lib/reports";
import { useAuthStore } from "../store/authStore";

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

  // Top Costliest Vehicles
  const topCostliest = useMemo(() => {
    if (!vehiclesQuery.data) return [];
    return [...vehiclesQuery.data]
      .sort((a, b) => b.operationalCost - a.operationalCost)
      .slice(0, 3);
  }, [vehiclesQuery.data]);

  const maxCost = topCostliest.length > 0 ? topCostliest[0].operationalCost : 1;

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
        <div>
          <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6">Monthly Revenue</h2>
          <div className="h-64 flex items-end gap-2 px-2 border-b-2 border-black/10 dark:border-white/10 pb-1">
            {/* Pseudo-chart bars mirroring the wireframe shape */}
            {[45, 55, 50, 75, 60, 90, 85].map((height, i) => (
              <div 
                key={i} 
                className="flex-1 bg-[#5C88C0] rounded-t hover:brightness-110 transition-all border border-black/20"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        {/* Right: Top Costliest Vehicles */}
        <div>
          <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6">Top Costliest Vehicles</h2>
          
          <div className="space-y-6">
            {topCostliest.map((v, i) => {
              const colors = ["bg-[#FF8888]", "bg-[#D97706]", "bg-[#5C88C0]"];
              const pct = maxCost > 0 ? Math.max((v.operationalCost / maxCost) * 100, 10) : 10;
              return (
                <div key={v.vehicleId} className="flex items-center gap-4">
                  <div className="w-24 text-xs font-mono font-bold text-[var(--text-secondary)]">
                    {v.registrationNumber}
                  </div>
                  <div className="flex-1 h-4 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colors[i % colors.length]}`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                  <div className="w-20 text-right text-xs font-bold text-[var(--text-primary)]">
                    {v.operationalCost.toLocaleString()}
                  </div>
                </div>
              );
            })}
            
            {topCostliest.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">No cost data available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
