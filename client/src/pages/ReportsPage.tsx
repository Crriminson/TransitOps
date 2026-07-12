import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVehicleReports, fetchUtilization, downloadReportsCsv } from "../lib/reports";
import { useAuthStore } from "../store/authStore";
import KpiCard from "../components/dashboard/KpiCard";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
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

  if (!canView) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-100">Reports</h1>
        <p className="text-slate-400 text-sm">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Reports &amp; Analytics</h1>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {downloading ? "Preparing…" : "Download CSV"}
        </button>
      </div>

      {utilQuery.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Fleet Utilization"
            value={`${utilQuery.data.fleetUtilization}%`}
            accent="text-blue-400"
          />
          <KpiCard label="Vehicles On Trip" value={utilQuery.data.onTrip} accent="text-blue-400" />
          <KpiCard label="Non-Retired Fleet" value={utilQuery.data.nonRetired} accent="text-slate-300" />
        </div>
      )}

      {vehiclesQuery.isLoading && <p className="text-slate-400 text-sm">Loading reports…</p>}
      {vehiclesQuery.isError && <p className="text-red-400 text-sm">Failed to load reports.</p>}

      {vehiclesQuery.data && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Distance (km)</th>
                <th className="px-4 py-3">Fuel (L)</th>
                <th className="px-4 py-3">Efficiency (km/L)</th>
                <th className="px-4 py-3">Operational Cost</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {vehiclesQuery.data.map((r) => (
                <tr key={r.vehicleId} className="text-slate-200">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{r.registrationNumber}</span>
                    <span className="text-slate-500"> — {r.name}</span>
                  </td>
                  <td className="px-4 py-3">{fmt(r.totalDistance)}</td>
                  <td className="px-4 py-3">{fmt(r.totalFuelConsumed)}</td>
                  <td className="px-4 py-3">
                    {r.fuelEfficiency === null ? "—" : fmt(r.fuelEfficiency)}
                  </td>
                  <td className="px-4 py-3">{fmt(r.operationalCost)}</td>
                  <td className="px-4 py-3">{fmt(r.revenue)}</td>
                  <td
                    className={`px-4 py-3 ${
                      r.roi > 0 ? "text-green-400" : r.roi < 0 ? "text-red-400" : "text-slate-300"
                    }`}
                  >
                    {(r.roi * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
