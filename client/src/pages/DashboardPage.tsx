import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  VehicleTypeEnum,
  VehicleStatusEnum,
  RegionEnum,
} from "@transitops/shared";
import { fetchDashboardKpis } from "../lib/dashboard";
import { fetchVehicles } from "../lib/vehicles";
import KpiCard from "../components/dashboard/KpiCard";
import StatusBadge from "../components/StatusBadge";
import { VEHICLE_STATUS_STYLES } from "../lib/statusColors";
import type { DashboardFilters } from "../types/dashboard";

const selectClass =
  "rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({});

  // KPI cards react to type + region (status drills the table only, since
  // several cards are themselves a status breakdown — server §3.2).
  const kpiFilters = { type: filters.type, region: filters.region };

  const kpiQuery = useQuery({
    queryKey: ["dashboard", kpiFilters],
    queryFn: () => fetchDashboardKpis(kpiFilters),
  });

  const vehicleQuery = useQuery({
    queryKey: ["vehicles", filters],
    queryFn: () => fetchVehicles(filters),
  });

  const kpis = kpiQuery.data;

  const setFilter = (key: keyof DashboardFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value === "" ? undefined : value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <select
            className={selectClass}
            value={filters.type ?? ""}
            onChange={(e) => setFilter("type", e.target.value)}
          >
            <option value="">All types</option>
            {VehicleTypeEnum.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={filters.status ?? ""}
            onChange={(e) => setFilter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {VehicleStatusEnum.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={filters.region ?? ""}
            onChange={(e) => setFilter("region", e.target.value)}
          >
            <option value="">All regions</option>
            {RegionEnum.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {(filters.type || filters.status || filters.region) && (
            <button
              onClick={() => setFilters({})}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      {kpiQuery.isLoading && <p className="text-slate-400 text-sm">Loading KPIs…</p>}
      {kpiQuery.isError && <p className="text-red-400 text-sm">Failed to load KPIs.</p>}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <KpiCard label="Fleet Utilization" value={`${kpis.fleetUtilization}%`} accent="text-blue-400" />
          <KpiCard label="Active Vehicles" value={kpis.activeVehicles} accent="text-blue-400" />
          <KpiCard label="Available Vehicles" value={kpis.availableVehicles} accent="text-green-400" />
          <KpiCard label="In Maintenance" value={kpis.inMaintenance} accent="text-amber-400" />
          <KpiCard label="Active Trips" value={kpis.activeTrips} accent="text-blue-400" />
          <KpiCard label="Pending Trips" value={kpis.pendingTrips} accent="text-slate-300" />
          <KpiCard label="Drivers On Duty" value={kpis.driversOnDuty} accent="text-green-400" />
        </div>
      )}

      {/* Filtered vehicle table (respects all three filters incl. status) */}
      <div className="space-y-3">
        <h2 className="text-base font-medium text-slate-200">Vehicles</h2>
        {vehicleQuery.data && (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {vehicleQuery.data.map((v) => (
                  <tr key={v.id} className="text-slate-200">
                    <td className="px-4 py-3 font-mono text-xs">{v.registrationNumber}</td>
                    <td className="px-4 py-3">{v.name}</td>
                    <td className="px-4 py-3">{v.type}</td>
                    <td className="px-4 py-3">{v.region}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={v.status} className={VEHICLE_STATUS_STYLES[v.status]} />
                    </td>
                  </tr>
                ))}
                {vehicleQuery.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No vehicles match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
