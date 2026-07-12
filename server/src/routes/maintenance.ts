import { Router, type Request } from "express";
import type { MaintenanceLog, Vehicle } from "@prisma/client";
import { maintenanceCreateSchema } from "@transitops/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";
import { emitOpsEvent } from "../lib/socket";
import { serializeVehicle } from "./vehicles";

const router = Router();

type MaintenanceWithVehicle = MaintenanceLog & { vehicle: Vehicle };

function serializeMaintenance(log: MaintenanceWithVehicle) {
  return {
    ...log,
    cost: Number(log.cost),
    vehicle: serializeVehicle(log.vehicle),
  };
}

function requireIdParam(req: Request): string {
  const { id } = req.params;
  if (typeof id !== "string") {
    throw new AppError(400, "Invalid maintenance id");
  }
  return id;
}

// GET /api/maintenance — any authenticated role (§5 "all read")
router.get("/", requireAuth, async (_req, res) => {
  const logs = await prisma.maintenanceLog.findMany({
    include: { vehicle: true },
    orderBy: { openedAt: "desc" },
  });
  res.json(logs.map(serializeMaintenance));
});

// GET /api/maintenance/:id — any authenticated role
router.get("/:id", requireAuth, async (req, res) => {
  const log = await prisma.maintenanceLog.findUnique({
    where: { id: requireIdParam(req) },
    include: { vehicle: true },
  });
  if (!log) {
    throw new AppError(404, "Maintenance record not found");
  }
  res.json(serializeMaintenance(log));
});

// POST /api/maintenance — Fleet Manager only. Process Flow §4.4: opening a
// record flips the vehicle to IN_SHOP in one transaction. Requires the
// vehicle be AVAILABLE — the state machine (§3) only draws the maintenance
// transition from AVAILABLE, and putting an ON_TRIP vehicle in the shop
// would strand its dispatched trip. (§4.4's literal guard lists only
// IN_SHOP/RETIRED; requiring AVAILABLE is stricter and state-correct.)
router.post("/", requireAuth, requireRole(["FLEET_MANAGER"]), async (req, res) => {
  const data = maintenanceCreateSchema.parse(req.body);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) {
    throw new AppError(404, "Vehicle not found");
  }
  if (vehicle.status === "IN_SHOP") {
    throw new AppError(409, "Vehicle is already in maintenance");
  }
  if (vehicle.status === "RETIRED") {
    throw new AppError(409, "Cannot open maintenance on a retired vehicle");
  }
  if (vehicle.status === "ON_TRIP") {
    throw new AppError(409, "Vehicle is currently on a trip");
  }

  const created = await prisma.$transaction(async (tx) => {
    const log = await tx.maintenanceLog.create({
      data: {
        vehicleId: data.vehicleId,
        description: data.description,
        cost: data.cost,
        status: "OPEN",
      },
    });
    await tx.vehicle.update({ where: { id: data.vehicleId }, data: { status: "IN_SHOP" } });
    return tx.maintenanceLog.findUniqueOrThrow({
      where: { id: log.id },
      include: { vehicle: true },
    });
  });

  emitOpsEvent("maintenance:opened", {
    vehicleId: data.vehicleId,
    maintenanceLogId: created.id,
  });
  res.status(201).json(serializeMaintenance(created));
});

// POST /api/maintenance/:id/close — Fleet Manager only. Process Flow §4.5:
// close the record, revert the vehicle to AVAILABLE (unless RETIRED), and
// always stamp lastServiceOdometer = current odometer (feeds the predictive
// maintenance nudge, Step 11).
router.post(
  "/:id/close",
  requireAuth,
  requireRole(["FLEET_MANAGER"]),
  async (req, res) => {
    const id = requireIdParam(req);
    const log = await prisma.maintenanceLog.findUnique({
      where: { id },
      include: { vehicle: true },
    });
    if (!log) {
      throw new AppError(404, "Maintenance record not found");
    }
    if (log.status !== "OPEN") {
      throw new AppError(409, "Maintenance record is already closed");
    }

    const closed = await prisma.$transaction(async (tx) => {
      await tx.maintenanceLog.update({
        where: { id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      await tx.vehicle.update({
        where: { id: log.vehicleId },
        data: {
          // Don't un-retire a vehicle that was retired mid-maintenance.
          ...(log.vehicle.status === "RETIRED" ? {} : { status: "AVAILABLE" }),
          lastServiceOdometer: log.vehicle.odometer,
        },
      });
      return tx.maintenanceLog.findUniqueOrThrow({
        where: { id },
        include: { vehicle: true },
      });
    });

    emitOpsEvent("maintenance:closed", {
      vehicleId: log.vehicleId,
      maintenanceLogId: id,
    });
    res.json(serializeMaintenance(closed));
  }
);

export default router;
