import { apiClient } from "./apiClient";
import type { VehicleReportRow, UtilizationReport } from "../types/report";

export async function fetchVehicleReports(): Promise<VehicleReportRow[]> {
  const { data } = await apiClient.get<VehicleReportRow[]>("/api/reports/vehicles");
  return data;
}

export async function fetchUtilization(): Promise<UtilizationReport> {
  const { data } = await apiClient.get<UtilizationReport>("/api/reports/utilization");
  return data;
}

// The CSV endpoint is auth-gated, so a plain <a href> won't work (no way to
// attach the Bearer header). Fetch it as a blob through apiClient, then
// trigger a client-side download.
export async function downloadReportsCsv(): Promise<void> {
  const { data } = await apiClient.get("/api/reports/export.csv", {
    responseType: "blob",
  });
  const url = URL.createObjectURL(data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vehicle-report.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
