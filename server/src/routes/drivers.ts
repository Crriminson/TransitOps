import { Router, type Request } from "express";
import { Prisma, type Driver } from "@prisma/client";
import {
  driverCreateSchema,
  driverUpdateSchema,
  driverStatusSchema,
} from "@transitops/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// licenseExpired is never stored — computed at query time from
// licenseExpiryDate (Technical Requirements §3.4), so it's always accurate
// without a background job.
function serializeDriver(driver: Driver) {
  return {
    ...driver,
    licenseExpired: driver.licenseExpiryDate.getTime() < Date.now(),
  };
}

// Express 5 (path-to-regexp v8) types req.params values as string | string[]
// to allow for repeated-param patterns — none of our routes use those.
function requireIdParam(req: Request): string {
  const { id } = req.params;
  if (typeof id !== "string") {
    throw new AppError(400, "Invalid driver id");
  }
  return id;
}

async function findDriverOr404(id: string): Promise<Driver> {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) {
    throw new AppError(404, "Driver not found");
  }
  return driver;
}

// GET /api/drivers — any authenticated role
router.get("/", requireAuth, async (_req, res) => {
  const drivers = await prisma.driver.findMany({ orderBy: { createdAt: "asc" } });
  res.json(drivers.map(serializeDriver));
});

// GET /api/drivers/:id — any authenticated role
router.get("/:id", requireAuth, async (req, res) => {
  const driver = await findDriverOr404(requireIdParam(req));
  res.json(serializeDriver(driver));
});

// POST /api/drivers — Fleet Manager + Safety Officer (§5 API surface)
router.post(
  "/",
  requireAuth,
  requireRole(["FLEET_MANAGER", "SAFETY_OFFICER"]),
  async (req, res) => {
    const data = driverCreateSchema.parse(req.body);

    try {
      const driver = await prisma.driver.create({
        data: {
          ...data,
          // Always server-set, never from the request body (§3.4/§4).
          status: "AVAILABLE",
        },
      });
      res.status(201).json(serializeDriver(driver));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new AppError(
          409,
          "A driver with this license number already exists",
          "licenseNumber"
        );
      }
      throw err;
    }
  }
);

// PATCH /api/drivers/:id — Fleet Manager + Safety Officer. Status changes
// only happen through the dedicated /status endpoint, never a generic
// field edit — Trip dispatch (Step 4) needs to own the ON_TRIP transition.
router.patch(
  "/:id",
  requireAuth,
  requireRole(["FLEET_MANAGER", "SAFETY_OFFICER"]),
  async (req, res) => {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "status")) {
      throw new AppError(
        400,
        "status cannot be changed via PATCH — use POST /api/drivers/:id/status"
      );
    }

    const data = driverUpdateSchema.parse(req.body);
    const id = requireIdParam(req);
    await findDriverOr404(id);

    try {
      const driver = await prisma.driver.update({ where: { id }, data });
      res.json(serializeDriver(driver));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new AppError(
          409,
          "A driver with this license number already exists",
          "licenseNumber"
        );
      }
      throw err;
    }
  }
);

// POST /api/drivers/:id/status — Fleet Manager + Safety Officer. Restricted
// to the manual transitions (Process Flow §3 Driver state machine):
// AVAILABLE, OFF_DUTY, SUSPENDED. ON_TRIP is set exclusively by Trip
// dispatch/complete (Step 4), never through this endpoint.
router.post(
  "/:id/status",
  requireAuth,
  requireRole(["FLEET_MANAGER", "SAFETY_OFFICER"]),
  async (req, res) => {
    const { status } = driverStatusSchema.parse(req.body);
    const id = requireIdParam(req);
    await findDriverOr404(id);

    const driver = await prisma.driver.update({ where: { id }, data: { status } });
    res.json(serializeDriver(driver));
  }
);

// DELETE /api/drivers/:id — Fleet Manager + Safety Officer. No cascading
// deletes: a driver referenced by Trips must be suspended/off-duty instead.
router.delete(
  "/:id",
  requireAuth,
  requireRole(["FLEET_MANAGER", "SAFETY_OFFICER"]),
  async (req, res) => {
    const id = requireIdParam(req);
    await findDriverOr404(id);

    try {
      await prisma.driver.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new AppError(
          409,
          "Cannot delete a driver with existing records — set them off duty or suspended instead"
        );
      }
      throw err;
    }
  }
);

export default router;
