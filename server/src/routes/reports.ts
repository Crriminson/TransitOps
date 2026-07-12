import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Reports are Fleet Manager + Financial Analyst only (§5 API surface / §2
// matrix). Applied to every route in this file.
const reportRoles = requireRole(["FLEET_MANAGER", "FINANCIAL_ANALYST"]);

interface VehicleReportRow {
  vehicleId: string;
  registrationNumber: string;
  name: string;
  type: string;
  region: string;
  acquisitionCost: number;
  totalDistance: number;
  totalFuelConsumed: number;
  fuelEfficiency: number | null; // km per liter; null when no fuel logged
  operationalCost: number; // SUM(fuel.cost) + SUM(maintenance.cost) — §3.7
  revenue: number; // SUM(trip.revenue) over COMPLETED trips — §3.8
  roi: number; // (revenue − operationalCost) / acquisitionCost — §3.8
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// Builds the per-vehicle report rows. Four grouped aggregations joined in
// memory by vehicleId — computed on read, never stored (§3.7/§3.8), so the
// numbers can never go stale.
async function buildVehicleReport(): Promise<VehicleReportRow[]> {
  const [vehicles, tripAgg, fuelAgg, maintAgg] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.trip.groupBy({
      by: ["vehicleId"],
      where: { status: "COMPLETED" },
      _sum: { actualDistance: true, revenue: true },
    }),
    prisma.fuelLog.groupBy({
      by: ["vehicleId"],
      _sum: { liters: true, cost: true },
    }),
    prisma.maintenanceLog.groupBy({
      by: ["vehicleId"],
      _sum: { cost: true },
    }),
  ]);

  const tripByVehicle = new Map(tripAgg.map((t) => [t.vehicleId, t._sum]));
  const fuelByVehicle = new Map(fuelAgg.map((f) => [f.vehicleId, f._sum]));
  const maintByVehicle = new Map(maintAgg.map((m) => [m.vehicleId, m._sum]));

  return vehicles.map((v) => {
    const trip = tripByVehicle.get(v.id);
    const fuel = fuelByVehicle.get(v.id);
    const maint = maintByVehicle.get(v.id);

    const totalDistance = Number(trip?.actualDistance ?? 0);
    const revenue = Number(trip?.revenue ?? 0);
    const totalFuelConsumed = Number(fuel?.liters ?? 0);
    const fuelCost = Number(fuel?.cost ?? 0);
    const maintenanceCost = Number(maint?.cost ?? 0);

    const operationalCost = fuelCost + maintenanceCost;
    const acquisitionCost = Number(v.acquisitionCost);
    const fuelEfficiency =
      totalFuelConsumed > 0 ? round(totalDistance / totalFuelConsumed, 2) : null;
    const roi =
      acquisitionCost > 0 ? round((revenue - operationalCost) / acquisitionCost, 4) : 0;

    return {
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      name: v.name,
      type: v.type,
      region: v.region,
      acquisitionCost,
      totalDistance: round(totalDistance, 2),
      totalFuelConsumed: round(totalFuelConsumed, 2),
      fuelEfficiency,
      operationalCost: round(operationalCost, 2),
      revenue: round(revenue, 2),
      roi,
    };
  });
}

// GET /api/reports/vehicles — consolidated per-vehicle metrics (fuel
// efficiency, operational cost, revenue, ROI). The §5 surface lists these
// as separate endpoints, but they share one aggregation, so a single row
// set backs the whole Reports table.
router.get("/vehicles", requireAuth, reportRoles, async (_req, res) => {
  res.json(await buildVehicleReport());
});

// GET /api/reports/utilization — fleet-wide utilization % (§3.2): vehicles
// ON_TRIP over total non-retired.
router.get("/utilization", requireAuth, reportRoles, async (_req, res) => {
  const [onTrip, nonRetired] = await prisma.$transaction([
    prisma.vehicle.count({ where: { status: "ON_TRIP" } }),
    prisma.vehicle.count({ where: { status: { not: "RETIRED" } } }),
  ]);
  const fleetUtilization = nonRetired > 0 ? round((onTrip / nonRetired) * 100, 1) : 0;
  res.json({ onTrip, nonRetired, fleetUtilization });
});

// Minimal RFC-4180 CSV escaping: quote fields containing comma, quote, or
// newline, doubling any embedded quotes.
function csvCell(value: string | number | null): string {
  const s = value === null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/reports/export.csv — streams the per-vehicle report as CSV.
router.get("/export.csv", requireAuth, reportRoles, async (_req, res) => {
  const rows = await buildVehicleReport();

  const header = [
    "Registration",
    "Name",
    "Type",
    "Region",
    "Acquisition Cost",
    "Total Distance (km)",
    "Total Fuel (L)",
    "Fuel Efficiency (km/L)",
    "Operational Cost",
    "Revenue",
    "ROI",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.registrationNumber,
        r.name,
        r.type,
        r.region,
        r.acquisitionCost,
        r.totalDistance,
        r.totalFuelConsumed,
        r.fuelEfficiency,
        r.operationalCost,
        r.revenue,
        r.roi,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="vehicle-report.csv"');
  res.send(lines.join("\n"));
});

export default router;
