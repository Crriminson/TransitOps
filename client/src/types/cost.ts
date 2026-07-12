import type { ExpenseType } from "@transitops/shared";
import type { Vehicle } from "./vehicle";

export interface FuelLog {
  id: string;
  vehicleId: string;
  tripId: string | null;
  liters: number;
  cost: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  vehicle: Vehicle;
}

export interface Expense {
  id: string;
  vehicleId: string;
  type: ExpenseType;
  amount: number;
  date: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: Vehicle;
}
