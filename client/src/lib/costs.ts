import type { FuelLogCreateInput, ExpenseCreateInput } from "@transitops/shared";
import { apiClient } from "./apiClient";
import type { FuelLog, Expense } from "../types/cost";

export async function fetchFuelLogs(): Promise<FuelLog[]> {
  const { data } = await apiClient.get<FuelLog[]>("/api/fuel-logs");
  return data;
}

export async function createFuelLog(input: FuelLogCreateInput): Promise<FuelLog> {
  const { data } = await apiClient.post<FuelLog>("/api/fuel-logs", input);
  return data;
}

export async function fetchExpenses(): Promise<Expense[]> {
  const { data } = await apiClient.get<Expense[]>("/api/expenses");
  return data;
}

export async function createExpense(input: ExpenseCreateInput): Promise<Expense> {
  const { data } = await apiClient.post<Expense>("/api/expenses", input);
  return data;
}
