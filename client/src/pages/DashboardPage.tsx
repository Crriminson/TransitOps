import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  VehicleTypeEnum,
  VehicleStatusEnum,
  RegionEnum,
} from "@transitops/shared";
import { fetchDashboardKpis } from "../lib/dashboard";
import { fetchTrips } from "../lib/trips";
import KpiCard from "../components/dashboard/KpiCard";
import StatusBadge from "../components/StatusBadge";
import { TRIP_STATUS_STYLES } from "../lib/statusColors";
import type { DashboardFilters } from "../types/dashboard";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({});

  const kpiFilters = { type: filters.type, region: filters.region };

  const kpiQuery = useQuery({
    queryKey: ["dashboard", kpiFilters],
    queryFn: () => fetchDashboardKpis(kpiFilters),
  });

  const tripQuery = useQuery({
    queryKey: ["trips"],
    queryFn: fetchTrips,
  });

  const kpis = kpiQuery.data;
  const recentTrips = tripQuery.data ? tripQuery.data.slice(0, 5) : [];

  const setFilter = (key: keyof DashboardFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value === "all" ? undefined : value }));
  };

  // Helper to calculate percentages for the progress bars
  const getTotalVehicles = () => {
    if (!kpis) return 1;
    return kpis.activeVehicles + kpis.availableVehicles + kpis.inMaintenance;
  };
  
  const getPercent = (value: number) => {
    const total = getTotalVehicles();
    return total === 0 ? 0 : Math.round((value / total) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.type ?? "all"} onValueChange={(val: string) => setFilter("type", val)}>
            <SelectTrigger className="w-[140px] bg-[var(--bg-primary)] border-[var(--border-color)]">
              <SelectValue placeholder="Vehicle Type: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vehicle Type: All</SelectItem>
              {VehicleTypeEnum.options.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status ?? "all"} onValueChange={(val: string) => setFilter("status", val)}>
            <SelectTrigger className="w-[140px] bg-[var(--bg-primary)] border-[var(--border-color)]">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              {VehicleStatusEnum.options.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.region ?? "all"} onValueChange={(val: string) => setFilter("region", val)}>
            <SelectTrigger className="w-[140px] bg-[var(--bg-primary)] border-[var(--border-color)]">
              <SelectValue placeholder="Region: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Region: All</SelectItem>
              {RegionEnum.options.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filters.type || filters.status || filters.region) && (
            <Button
              variant="ghost"
              onClick={() => setFilters({})}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      {kpiQuery.isLoading && <p className="text-[var(--text-secondary)] text-sm">Loading KPIs…</p>}
      {kpiQuery.isError && <p className="text-red-400 text-sm">Failed to load KPIs.</p>}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <KpiCard label="Active Vehicles" value={kpis.activeVehicles} />
          <KpiCard label="Available Vehicles" value={kpis.availableVehicles} accent="text-green-400" />
          <KpiCard label="In Maintenance" value={kpis.inMaintenance} accent="text-[var(--brand-color)]" />
          <KpiCard label="Active Trips" value={kpis.activeTrips} />
          <KpiCard label="Pending Trips" value={kpis.pendingTrips} />
          <KpiCard label="Drivers On Duty" value={kpis.driversOnDuty} />
          <KpiCard label="Fleet Utilization" value={`${kpis.fleetUtilization}%`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Recent Trips</h2>
          <Card className="bg-[var(--bg-primary)] border-[var(--border-color)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Driver</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">ETA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {recentTrips.map((trip) => (
                    <tr key={trip.id} className="text-[var(--text-primary)]">
                      <td className="px-4 py-4 font-mono font-medium">{trip.trackingNumber}</td>
                      <td className="px-4 py-4">{trip.vehicle?.name || "—"}</td>
                      <td className="px-4 py-4">{trip.driver?.name || "—"}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={trip.status} className={TRIP_STATUS_STYLES[trip.status]} />
                      </td>
                      <td className="px-4 py-4 text-[var(--text-secondary)]">
                        {trip.status === "DISPATCHED" ? "45 min" : "—"}
                      </td>
                    </tr>
                  ))}
                  {recentTrips.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                        No recent trips.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Vehicle Status Summary */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Vehicle Status</h2>
          <Card className="bg-[var(--bg-primary)] border-[var(--border-color)]">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-primary)] font-medium">Available</span>
                  <span className="text-[var(--text-secondary)]">{kpis?.availableVehicles || 0}</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${getPercent(kpis?.availableVehicles || 0)}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-primary)] font-medium">On Trip</span>
                  <span className="text-[var(--text-secondary)]">{kpis?.activeVehicles || 0}</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${getPercent(kpis?.activeVehicles || 0)}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-primary)] font-medium">In Shop</span>
                  <span className="text-[var(--text-secondary)]">{kpis?.inMaintenance || 0}</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--brand-color)] rounded-full" style={{ width: `${getPercent(kpis?.inMaintenance || 0)}%` }} />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-primary)] font-medium">Retired</span>
                  <span className="text-[var(--text-secondary)]">0</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `0%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
