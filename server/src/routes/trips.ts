import { Router, type Request } from "express";
import { randomUUID } from "crypto";
import type { Trip, Vehicle, Driver } from "@prisma/client";
import { tripCreateSchema, tripCompleteSchema, tripHaltSchema } from "@transitops/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";
import { emitOpsEvent } from "../lib/socket";
import { serializeVehicle } from "./vehicles";
import { serializeDriver } from "./drivers";

const router = Router();

type TripWithRelations = Trip & { vehicle: Vehicle; driver: Driver };

// Trip's own Decimal fields, plus the nested vehicle/driver — reusing their
// own serializers so a driver/vehicle looks identical whether it's fetched
// top-level or nested inside a trip (e.g. licenseExpired stays present).
function serializeTrip(trip: TripWithRelations) {
  return {
    ...trip,
    cargoWeight: Number(trip.cargoWeight),
    plannedDistance: Number(trip.plannedDistance),
    actualDistance: trip.actualDistance !== null ? Number(trip.actualDistance) : null,
    revenue: Number(trip.revenue),
    finalOdometer: trip.finalOdometer !== null ? Number(trip.finalOdometer) : null,
    fuelConsumed: trip.fuelConsumed !== null ? Number(trip.fuelConsumed) : null,
    vehicle: serializeVehicle(trip.vehicle),
    driver: serializeDriver(trip.driver),
  };
}

function requireIdParam(req: Request): string {
  const { id } = req.params;
  if (typeof id !== "string") {
    throw new AppError(400, "Invalid trip id");
  }
  return id;
}

async function findTripOr404(id: string): Promise<TripWithRelations> {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { vehicle: true, driver: true },
  });
  if (!trip) {
    throw new AppError(404, "Trip not found");
  }
  return trip;
}

function generateTrackingNumber(): string {
  return `TO-${randomUUID().split("-")[0]!.toUpperCase()}`;
}

const WRITE_ROLES = ["FLEET_MANAGER", "DRIVER"] as const;

// GET /api/trips — any authenticated role
router.get("/", requireAuth, async (_req, res) => {
  const trips = await prisma.trip.findMany({
    include: { vehicle: true, driver: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(trips.map(serializeTrip));
});

// GET /api/trips/:id — any authenticated role
router.get("/:id", requireAuth, async (req, res) => {
  const trip = await findTripOr404(requireIdParam(req));
  res.json(serializeTrip(trip));
});

// POST /api/trips — Fleet Manager + Driver. Creates in DRAFT — no
// transaction, no socket event (a DRAFT was never broadcast, Process Flow
// §4.8 step 4 — only dispatch/complete/cancel/halt/resume are).
router.post("/", requireAuth, requireRole([...WRITE_ROLES]), async (req, res) => {
  const data = tripCreateSchema.parse(req.body);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) {
    throw new AppError(404, "Vehicle not found");
  }
  const driver = await prisma.driver.findUnique({ where: { id: data.driverId } });
  if (!driver) {
    throw new AppError(404, "Driver not found");
  }
  if (data.cargoWeight > Number(vehicle.maxLoadCapacity)) {
    throw new AppError(400, "Cargo weight exceeds the vehicle's max load capacity");
  }

  const trip = await prisma.trip.create({
    data: {
      ...data,
      trackingNumber: generateTrackingNumber(),
      status: "DRAFT",
    },
    include: { vehicle: true, driver: true },
  });

  res.status(201).json(serializeTrip(trip));
});

// POST /api/trips/:id/dispatch — Fleet Manager + Driver. Full validation
// chain per Process Flow §4.1, transactional.
router.post(
  "/:id/dispatch",
  requireAuth,
  requireRole([...WRITE_ROLES]),
  async (req, res) => {
    const id = requireIdParam(req);
    const trip = await findTripOr404(id);

    if (trip.status !== "DRAFT") {
      throw new AppError(409, "Trip must be in DRAFT status to dispatch");
    }
    if (trip.vehicle.status !== "AVAILABLE") {
      throw new AppError(409, "Vehicle is not available");
    }
    if (trip.driver.status !== "AVAILABLE") {
      throw new AppError(409, "Driver is not available");
    }
    if (trip.driver.licenseExpiryDate.getTime() < Date.now()) {
      throw new AppError(409, "Driver's license has expired");
    }
    // Process Flow §4.1 step 5 calls out an explicit "driver not SUSPENDED"
    // check here, noting it's redundant with the AVAILABLE check above. It
    // is: TS proves driver.status is narrowed to the literal "AVAILABLE" by
    // this point, so a runtime SUSPENDED check would be dead code — omitted
    // rather than kept alive with an unsafe cast.
    if (Number(trip.cargoWeight) > Number(trip.vehicle.maxLoadCapacity)) {
      throw new AppError(400, "Cargo weight exceeds the vehicle's max load capacity");
    }

    const updatedTrip = await prisma.$transaction(async (tx) => {
      await tx.trip.update({
        where: { id },
        data: { status: "DISPATCHED", dispatchedAt: new Date() },
      });
      await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "ON_TRIP" } });
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: "ON_TRIP" } });
      return tx.trip.findUniqueOrThrow({
        where: { id },
        include: { vehicle: true, driver: true },
      });
    });

    emitOpsEvent("trip:dispatched", {
      tripId: id,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
    });
    res.json(serializeTrip(updatedTrip));
  }
);

// POST /api/trips/:id/complete — Fleet Manager + Driver. Process Flow §4.2:
// requires finalOdometer + fuelConsumed, transactional, also writes a
// FuelLog row. cost is not collected on this form (only Step 6's Fuel &
// Expense screens collect a real cost) so it defaults to 0 here.
router.post(
  "/:id/complete",
  requireAuth,
  requireRole([...WRITE_ROLES]),
  async (req, res) => {
    const { finalOdometer, fuelConsumed } = tripCompleteSchema.parse(req.body);
    const id = requireIdParam(req);
    const trip = await findTripOr404(id);

    if (trip.status !== "DISPATCHED") {
      throw new AppError(409, "Trip must be DISPATCHED to complete");
    }

    const actualDistance = finalOdometer - Number(trip.vehicle.odometer);
    if (actualDistance < 0) {
      throw new AppError(
        400,
        "Final odometer cannot be less than the vehicle's current odometer"
      );
    }

    const updatedTrip = await prisma.$transaction(async (tx) => {
      await tx.trip.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          actualDistance,
          finalOdometer,
          fuelConsumed,
        },
      });
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { odometer: finalOdometer, status: "AVAILABLE" },
      });
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } });
      await tx.fuelLog.create({
        data: {
          vehicleId: trip.vehicleId,
          tripId: id,
          liters: fuelConsumed,
          cost: fuelConsumed * 95, // Calculated using standard mock rate of $95/L
          date: new Date(),
        },
      });
      return tx.trip.findUniqueOrThrow({
        where: { id },
        include: { vehicle: true, driver: true },
      });
    });

    emitOpsEvent("trip:completed", {
      tripId: id,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      actualDistance,
      fuelConsumed,
    });
    res.json(serializeTrip(updatedTrip));
  }
);

// POST /api/trips/:id/cancel — Fleet Manager + Driver. Process Flow §4.3:
// reachable from DRAFT or DISPATCHED only; reverts vehicle/driver only if
// the trip had actually been dispatched.
router.post("/:id/cancel", requireAuth, requireRole([...WRITE_ROLES]), async (req, res) => {
  const id = requireIdParam(req);
  const trip = await findTripOr404(id);

  if (trip.status !== "DRAFT" && trip.status !== "DISPATCHED") {
    throw new AppError(409, "Trip must be DRAFT or DISPATCHED to cancel");
  }

  const wasDispatched = trip.status === "DISPATCHED";

  const updatedTrip = await prisma.$transaction(async (tx) => {
    await tx.trip.update({ where: { id }, data: { status: "CANCELLED" } });
    if (wasDispatched) {
      await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: "AVAILABLE" } });
      await tx.driver.update({ where: { id: trip.driverId }, data: { status: "AVAILABLE" } });
    }
    return tx.trip.findUniqueOrThrow({
      where: { id },
      include: { vehicle: true, driver: true },
    });
  });

  emitOpsEvent("trip:cancelled", { tripId: id, wasDispatched });
  res.json(serializeTrip(updatedTrip));
});

// POST /api/trips/:id/halt — Fleet Manager + Driver. Process Flow §4.7:
// only from DISPATCHED; vehicle/driver stay ON_TRIP (still committed to
// this trip, just not moving), so no transaction needed beyond the trip
// row itself.
router.post("/:id/halt", requireAuth, requireRole([...WRITE_ROLES]), async (req, res) => {
  const { haltReason } = tripHaltSchema.parse(req.body);
  const id = requireIdParam(req);
  const trip = await findTripOr404(id);

  if (trip.status !== "DISPATCHED") {
    throw new AppError(409, "Trip must be DISPATCHED to halt");
  }

  const updatedTrip = await prisma.trip.update({
    where: { id },
    data: { status: "HALTED", haltReason },
    include: { vehicle: true, driver: true },
  });

  emitOpsEvent("trip:halted", { tripId: id, haltReason });
  res.json(serializeTrip(updatedTrip));
});

// POST /api/trips/:id/resume — Fleet Manager + Driver. Only from HALTED.
router.post("/:id/resume", requireAuth, requireRole([...WRITE_ROLES]), async (req, res) => {
  const id = requireIdParam(req);
  const trip = await findTripOr404(id);

  if (trip.status !== "HALTED") {
    throw new AppError(409, "Trip must be HALTED to resume");
  }

  const updatedTrip = await prisma.trip.update({
    where: { id },
    data: { status: "DISPATCHED", haltReason: null },
    include: { vehicle: true, driver: true },
  });

  emitOpsEvent("trip:resumed", { tripId: id });
  res.json(serializeTrip(updatedTrip));
});

export default router;
