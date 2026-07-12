import type { TripStatus } from "@transitops/shared";
import type { Vehicle } from "./vehicle";
import type { Driver } from "./driver";

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  routeId: string | null;
  cargoWeight: number;
  plannedDistance: number;
  actualDistance: number | null;
  revenue: number;
  trackingNumber: string;
  lrNumber: string | null;
  parcelCount: number | null;
  finalOdometer: number | null;
  fuelConsumed: number | null;
  status: TripStatus;
  haltReason: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: Vehicle;
  driver: Driver;
}
