import type { VehicleType, VehicleStatus, Region } from "@transitops/shared";

export interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: VehicleType;
  maxLoadCapacity: number;
  odometer: number;
  acquisitionCost: number;
  status: VehicleStatus;
  region: Region;
  lastServiceOdometer: number;
  createdAt: string;
  updatedAt: string;
}
