import type { MaintenanceLogStatus } from "@transitops/shared";
import type { Vehicle } from "./vehicle";

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  status: MaintenanceLogStatus;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: Vehicle;
}
