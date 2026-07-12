import { Router, type Request } from "express";
import { Prisma, type Vehicle } from "@prisma/client";
import { vehicleCreateSchema, vehicleUpdateSchema, VehicleStatusEnum } from "@transitops/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Prisma's Decimal fields serialize via JSON.stringify as strings, not
// numbers — convert them here so the client always receives real numbers.
// Exported for reuse by routes/trips.ts, which nests a serialized vehicle
// on each trip.
export function serializeVehicle(vehicle: Vehicle) {
  return {
    ...vehicle,
    maxLoadCapacity: Number(vehicle.maxLoadCapacity),
    odometer: Number(vehicle.odometer),
    acquisitionCost: Number(vehicle.acquisitionCost),
    lastServiceOdometer: Number(vehicle.lastServiceOdometer),
  };
}

// Express 5 (path-to-regexp v8) types req.params values as string | string[]
// to allow for repeated-param patterns — none of our routes use those, so a
// non-string id here means the request genuinely doesn't match our routes.
function requireIdParam(req: Request): string {
  const { id } = req.params;
  if (typeof id !== "string") {
    throw new AppError(400, "Invalid vehicle id");
  }
  return id;
}

async function findVehicleOr404(id: string): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) {
    throw new AppError(404, "Vehicle not found");
  }
  return vehicle;
}

// GET /api/vehicles — any authenticated role. Optional ?status= filter
// feeds the Trip creation form's "available vehicle pool" dropdown
// (Process Flow: dispatch-eligible queries filter at the query level, not
// client-side, so a stale cache can't offer an unavailable vehicle).
router.get("/", requireAuth, async (req, res) => {
  const { status } = req.query;
  let where: Prisma.VehicleWhereInput | undefined;
  if (status !== undefined) {
    const parsed = VehicleStatusEnum.safeParse(status);
    if (!parsed.success) {
      throw new AppError(400, "Invalid status filter");
    }
    where = { status: parsed.data };
  }

  const vehicles = await prisma.vehicle.findMany({ where, orderBy: { createdAt: "asc" } });
  res.json(vehicles.map(serializeVehicle));
});

// GET /api/vehicles/:id — any authenticated role
router.get("/:id", requireAuth, async (req, res) => {
  const vehicle = await findVehicleOr404(requireIdParam(req));
  res.json(serializeVehicle(vehicle));
});

// POST /api/vehicles — Fleet Manager only
router.post("/", requireAuth, requireRole(["FLEET_MANAGER"]), async (req, res) => {
  const data = vehicleCreateSchema.parse(req.body);

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        ...data,
        // Always server-set, never from the request body (§3.3/§4).
        status: "AVAILABLE",
        lastServiceOdometer: 0,
      },
    });
    res.status(201).json(serializeVehicle(vehicle));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(
        409,
        "A vehicle with this registration number already exists",
        "registrationNumber"
      );
    }
    throw err;
  }
});

// PATCH /api/vehicles/:id — Fleet Manager only. Status changes only happen
// through the dedicated /retire endpoint, never a generic field edit.
router.patch("/:id", requireAuth, requireRole(["FLEET_MANAGER"]), async (req, res) => {
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "status")) {
    throw new AppError(
      400,
      "status cannot be changed via PATCH — use POST /api/vehicles/:id/retire"
    );
  }

  const data = vehicleUpdateSchema.parse(req.body);
  const id = requireIdParam(req);
  await findVehicleOr404(id);

  try {
    const vehicle = await prisma.vehicle.update({ where: { id }, data });
    res.json(serializeVehicle(vehicle));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(
        409,
        "A vehicle with this registration number already exists",
        "registrationNumber"
      );
    }
    throw err;
  }
});

// POST /api/vehicles/:id/retire — Fleet Manager only. The one manual,
// terminal, no-guard transition (Process Flow §3) — idempotent by design.
router.post(
  "/:id/retire",
  requireAuth,
  requireRole(["FLEET_MANAGER"]),
  async (req, res) => {
    const id = requireIdParam(req);
    await findVehicleOr404(id);

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { status: "RETIRED" },
    });
    res.json(serializeVehicle(vehicle));
  }
);

// DELETE /api/vehicles/:id — Fleet Manager only. No cascading deletes: a
// vehicle referenced by Trips/MaintenanceLogs/FuelLogs/Expenses must be
// retired instead (mirrors Route deletion, Process Flow §7.7).
router.delete("/:id", requireAuth, requireRole(["FLEET_MANAGER"]), async (req, res) => {
  const id = requireIdParam(req);
  await findVehicleOr404(id);

  try {
    await prisma.vehicle.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new AppError(
        409,
        "Cannot delete a vehicle with existing records — retire it instead"
      );
    }
    throw err;
  }
});

export default router;
