import { Router, type Request } from "express";
import type { Prisma } from "@prisma/client";
import { VehicleTypeEnum, RegionEnum } from "@transitops/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Parse an optional enum query param, 400 on an invalid value. Returns the
// validated string (or undefined); callers cast into Prisma where-inputs,
// which is safe because the value is guaranteed to be a real enum member.
function optionalEnum(
  value: unknown,
  schema: { safeParse: (v: unknown) => { success: boolean } },
  label: string
): string | undefined {
  if (value === undefined) return undefined;
  if (!schema.safeParse(value).success) {
    throw new AppError(400, `Invalid ${label} filter`);
  }
  return value as string;
}

// GET /api/dashboard/kpis — any authenticated role. Filters: type + region
// scope the KPI cards; `status` is intentionally NOT applied here — several
// cards ARE a status breakdown (Active/Available/In-Maintenance), so a status
// filter would make them degenerate. `status` drills the vehicle table
// underneath instead (GET /api/vehicles). See Technical Requirements §3.2.
router.get("/kpis", requireAuth, async (req: Request, res) => {
  const type = optionalEnum(req.query.type, VehicleTypeEnum, "type");
  const region = optionalEnum(req.query.region, RegionEnum, "region");

  // Vehicle scope: type + region only (status is what several KPIs break
  // down by). Drivers share the region filter; type is vehicle-only.
  const vehicleScope = {
    ...(type ? { type } : {}),
    ...(region ? { region } : {}),
  } as Prisma.VehicleWhereInput;

  const tripVehicleScope = (
    type || region ? { vehicle: { ...(type ? { type } : {}), ...(region ? { region } : {}) } } : {}
  ) as Prisma.TripWhereInput;

  const driverRegionScope = (region ? { region } : {}) as Prisma.DriverWhereInput;

  const [
    activeVehicles,
    availableVehicles,
    inMaintenance,
    nonRetired,
    activeTrips,
    pendingTrips,
    driversOnDuty,
  ] = await prisma.$transaction([
    prisma.vehicle.count({ where: { ...vehicleScope, status: "ON_TRIP" } }),
    prisma.vehicle.count({ where: { ...vehicleScope, status: "AVAILABLE" } }),
    prisma.vehicle.count({ where: { ...vehicleScope, status: "IN_SHOP" } }),
    prisma.vehicle.count({ where: { ...vehicleScope, status: { not: "RETIRED" } } }),
    prisma.trip.count({ where: { status: { in: ["DISPATCHED", "HALTED"] }, ...tripVehicleScope } }),
    prisma.trip.count({ where: { status: "DRAFT", ...tripVehicleScope } }),
    prisma.driver.count({
      where: { status: { in: ["AVAILABLE", "ON_TRIP"] }, ...driverRegionScope },
    }),
  ]);

  const fleetUtilization =
    nonRetired > 0 ? Math.round((activeVehicles / nonRetired) * 1000) / 10 : 0;

  res.json({
    activeVehicles,
    availableVehicles,
    inMaintenance,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    fleetUtilization,
  });
});

export default router;
