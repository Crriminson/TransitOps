import type {
  VehicleCreateInput,
  VehicleUpdateInput,
  VehicleType,
  VehicleStatus,
  Region,
} from "@transitops/shared";
import { apiClient } from "./apiClient";
import type { Vehicle } from "../types/vehicle";

export interface VehicleFilters {
  type?: VehicleType;
  status?: VehicleStatus;
  region?: Region;
}

// Optional filters (type/status/region) power the Dashboard's filtered
// vehicle table (§3.2); all combine server-side (AND). Passing no filters
// returns the full fleet.
export async function fetchVehicles(filters: VehicleFilters = {}): Promise<Vehicle[]> {
  const { data } = await apiClient.get<Vehicle[]>("/api/vehicles", { params: filters });
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
