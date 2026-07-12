import type { TripCreateInput, TripCompleteInput } from "@transitops/shared";
import { apiClient } from "./apiClient";
import type { Trip } from "../types/trip";

export async function fetchTrips(): Promise<Trip[]> {
  const { data } = await apiClient.get<Trip[]>("/api/trips");
  return data;
}

export async function createTrip(input: TripCreateInput): Promise<Trip> {
  const { data } = await apiClient.post<Trip>("/api/trips", input);
  return data;
}

export async function dispatchTrip(id: string): Promise<Trip> {
  const { data } = await apiClient.post<Trip>(`/api/trips/${id}/dispatch`);
  return data;
}

export async function completeTrip(id: string, input: TripCompleteInput): Promise<Trip> {
  const { data } = await apiClient.post<Trip>(`/api/trips/${id}/complete`, input);
  return data;
}

export async function cancelTrip(id: string): Promise<Trip> {
  const { data } = await apiClient.post<Trip>(`/api/trips/${id}/cancel`);
  return data;
}

export async function haltTrip(id: string, haltReason: string): Promise<Trip> {
  const { data } = await apiClient.post<Trip>(`/api/trips/${id}/halt`, { haltReason });
  return data;
}

export async function resumeTrip(id: string): Promise<Trip> {
  const { data } = await apiClient.post<Trip>(`/api/trips/${id}/resume`);
  return data;
}
