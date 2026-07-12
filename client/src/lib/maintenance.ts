import type { MaintenanceCreateInput } from "@transitops/shared";
import { apiClient } from "./apiClient";
import type { MaintenanceLog } from "../types/maintenance";

export async function fetchMaintenanceLogs(): Promise<MaintenanceLog[]> {
  const { data } = await apiClient.get<MaintenanceLog[]>("/api/maintenance");
  return data;
}

export async function openMaintenance(
  input: MaintenanceCreateInput
): Promise<MaintenanceLog> {
  const { data } = await apiClient.post<MaintenanceLog>("/api/maintenance", input);
  return data;
}

export async function closeMaintenance(id: string): Promise<MaintenanceLog> {
  const { data } = await apiClient.post<MaintenanceLog>(`/api/maintenance/${id}/close`);
  return data;
}
