import type {
  DriverCreateInput,
  DriverUpdateInput,
  DriverStatusInput,
} from "@transitops/shared";
import { apiClient } from "./apiClient";
import type { Driver } from "../types/driver";

export async function fetchDrivers(): Promise<Driver[]> {
  const { data } = await apiClient.get<Driver[]>("/api/drivers");
  return data;
}

// Feeds the Trip creation form's driver dropdown — server-side filtered
// (query-level, not client-side) so a stale cache can't offer an
// already-busy driver.
export async function fetchAvailableDrivers(): Promise<Driver[]> {
  const { data } = await apiClient.get<Driver[]>("/api/drivers", {
    params: { status: "AVAILABLE" },
  });
  return data;
}

export async function createDriver(input: DriverCreateInput): Promise<Driver> {
  const { data } = await apiClient.post<Driver>("/api/drivers", input);
  return data;
}

export async function updateDriver(
  id: string,
  input: DriverUpdateInput
): Promise<Driver> {
  const { data } = await apiClient.patch<Driver>(`/api/drivers/${id}`, input);
  return data;
}

export async function setDriverStatus(
  id: string,
  status: DriverStatusInput["status"]
): Promise<Driver> {
  const { data } = await apiClient.post<Driver>(`/api/drivers/${id}/status`, {
    status,
  });
  return data;
}
