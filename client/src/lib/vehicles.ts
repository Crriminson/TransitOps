import type { VehicleCreateInput, VehicleUpdateInput } from "@transitops/shared";
import { apiClient } from "./apiClient";
import type { Vehicle } from "../types/vehicle";

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[]>("/api/vehicles");
  return data;
}

// Feeds the Trip creation form's vehicle dropdown — server-side filtered
// (query-level, not client-side) so a stale cache can't offer an
// already-busy vehicle.
export async function fetchAvailableVehicles(): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[]>("/api/vehicles", {
    params: { status: "AVAILABLE" },
  });
  return data;
}

export async function createVehicle(input: VehicleCreateInput): Promise<Vehicle> {
  const { data } = await apiClient.post<Vehicle>("/api/vehicles", input);
  return data;
}

export async function updateVehicle(
  id: string,
  input: VehicleUpdateInput
): Promise<Vehicle> {
  const { data } = await apiClient.patch<Vehicle>(`/api/vehicles/${id}`, input);
  return data;
}

export async function retireVehicle(id: string): Promise<Vehicle> {
  const { data } = await apiClient.post<Vehicle>(`/api/vehicles/${id}/retire`);
  return data;
}
