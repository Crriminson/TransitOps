export interface VehicleReportRow {
  vehicleId: string;
  registrationNumber: string;
  name: string;
  type: string;
  region: string;
  acquisitionCost: number;
  totalDistance: number;
  totalFuelConsumed: number;
  fuelEfficiency: number | null;
  operationalCost: number;
  revenue: number;
  roi: number;
}

export interface UtilizationReport {
  onTrip: number;
  nonRetired: number;
  fleetUtilization: number;
}
