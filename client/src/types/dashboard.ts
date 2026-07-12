export interface DashboardKpis {
  activeVehicles: number;
  availableVehicles: number;
  inMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
}

import type { VehicleType, VehicleStatus, Region } from "@transitops/shared";

export interface DashboardFilters {
  type?: VehicleType;
  status?: VehicleStatus;
  region?: Region;
}
