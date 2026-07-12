import { Router } from "express";
import type { FuelLog, Vehicle } from "@prisma/client";
import { fuelLogCreateSchema } from "@transitops/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";
import { emitOpsEvent } from "../lib/socket";
import { serializeVehicle } from "./vehicles";

const router = Router();

type FuelLogWithVehicle = FuelLog & { vehicle: Vehicle };

function serializeFuelLog(log: FuelLogWithVehicle) {
  return {
    ...log,
    liters: Number(log.liters),
    cost: Number(log.cost),
    vehicle: serializeVehicle(log.vehicle),
  };
}

// GET /api/fuel-logs — any authenticated role (§5 "all read")
router.get("/", requireAuth, async (_req, res) => {
  const logs = await prisma.fuelLog.findMany({
    include: { vehicle: true },
    orderBy: { date: "desc" },
  });
  res.json(logs.map(serializeFuelLog));
});

// POST /api/fuel-logs — Fleet Manager only. Process Flow §4.6: a plain
// create, no state machine — but emits cost:logged so the dashboard's
// operational-cost KPI and anomaly badges re-derive live. (Drivers log fuel
// via trip completion, §4.2, not this endpoint.)
router.post("/", requireAuth, requireRole(["FLEET_MANAGER"]), async (req, res) => {
  const data = fuelLogCreateSchema.parse(req.body);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) {
    throw new AppError(404, "Vehicle not found");
  }
  if (data.tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
    if (!trip) {
      throw new AppError(404, "Trip not found");
    }
  }

  const log = await prisma.fuelLog.create({
    data,
    include: { vehicle: true },
  });

  emitOpsEvent("cost:logged", { vehicleId: data.vehicleId });
  res.status(201).json(serializeFuelLog(log));
});

export default router;
