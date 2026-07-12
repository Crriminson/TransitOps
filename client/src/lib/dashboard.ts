import { apiClient } from "./apiClient";
import type { DashboardKpis, DashboardFilters } from "../types/dashboard";

// Only type + region reach the KPI endpoint — status drills the vehicle
// table, not the cards (server §3.2).
export async function fetchDashboardKpis(
  filters: DashboardFilters
): Promise<DashboardKpis> {
  const { data } = await apiClient.get<DashboardKpis>("/api/dashboard/kpis", {
    params: { type: filters.type, region: filters.region },
  });
  return data;
}
