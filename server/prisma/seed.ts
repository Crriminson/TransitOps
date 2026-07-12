/**
 * TransitOps — Seed Script Skeleton
 * Location: server/prisma/seed.ts
 *
 * Wired via server/package.json `prisma.seed` key.
 * Run with: npm run seed --workspace=server  (from repo root)
 *        or: npx prisma db seed              (from /server directory)
 *
 * Each section below is a placeholder for one entity.
 * Feature branches fill in their own section when they land:
 *
 *   Step 1  (Auth)          → User section
 *   Step 2  (Vehicles)      → Vehicle section
 *   Step 3  (Drivers)       → Driver section
 *   Step 15 (Named Routes)  → Route section
 *   Step 4  (Trips)         → Trip section
 *   Step 5  (Maintenance)   → MaintenanceLog section
 *   Step 6  (Fuel/Expense)  → FuelLog + Expense sections
 *
 * Running this script now executes without error and logs a status message.
 */

import { PrismaClient, type Vehicle, type Driver } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const BCRYPT_COST_FACTOR = 10;

// Same known password across all four demo users, for demo convenience.
// Documented in README, not hardcoded into the running app's data logic
// (Technical Requirements §3.1).
const DEMO_PASSWORD = "demo1234";

async function main(): Promise<void> {
  console.log("🌱 TransitOps seed — starting...");

  // -------------------------------------------------------------------------
  // User  (Step 1 — Auth + RBAC)
  // Seed one demo user per role: FLEET_MANAGER, DRIVER, SAFETY_OFFICER,
  // FINANCIAL_ANALYST. Passwords hashed with bcrypt (cost 10).
  // -------------------------------------------------------------------------
  const demoPasswordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST_FACTOR);

  const demoUsers = [
    {
      name: "Priya Sharma",
      email: "manager@transitops.local",
      role: "FLEET_MANAGER" as const,
    },
    {
      name: "Arjun Mehta",
      email: "driver@transitops.local",
      role: "DRIVER" as const,
    },
    {
      name: "Kavita Rao",
      email: "safety@transitops.local",
      role: "SAFETY_OFFICER" as const,
    },
    {
      name: "Rohan Desai",
      email: "analyst@transitops.local",
      role: "FINANCIAL_ANALYST" as const,
    },
  ];

  for (const demoUser of demoUsers) {
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {},
      create: { ...demoUser, passwordHash: demoPasswordHash },
    });
  }

  console.log(`   Seeded ${demoUsers.length} demo users (one per role)`);

  // -------------------------------------------------------------------------
  // Vehicle  (Step 2 — Vehicle Registry)
  // Every VehicleType and every Region represented at least once. Only
  // AVAILABLE/RETIRED seeded here — ON_TRIP/IN_SHOP only make sense once
  // Trip (Step 4) and Maintenance (Step 5) exist to put a vehicle in them.
  // -------------------------------------------------------------------------
  const demoVehicles = [
    {
      registrationNumber: "MH12AB1234",
      name: "Tata Prima 2830.K",
      type: "TRUCK" as const,
      maxLoadCapacity: 16000,
      odometer: 45230,
      acquisitionCost: 3200000,
      status: "AVAILABLE" as const,
      region: "NORTH" as const,
      lastServiceOdometer: 42000,
    },
    {
      registrationNumber: "DL8CAF5678",
      name: "Mahindra Bolero Pik-Up",
      type: "VAN" as const,
      maxLoadCapacity: 1500,
      odometer: 21000,
      acquisitionCost: 950000,
      status: "AVAILABLE" as const,
      region: "SOUTH" as const,
      lastServiceOdometer: 18500,
    },
    {
      registrationNumber: "KA05MN9012",
      name: "Tata Ace Gold",
      type: "MINI_TRUCK" as const,
      maxLoadCapacity: 750,
      odometer: 15400,
      acquisitionCost: 620000,
      status: "AVAILABLE" as const,
      region: "EAST" as const,
      lastServiceOdometer: 12000,
    },
    {
      registrationNumber: "TN09XY3456",
      name: "Ashok Leyland 3718",
      type: "TRAILER" as const,
      maxLoadCapacity: 25000,
      odometer: 68900,
      acquisitionCost: 4500000,
      status: "AVAILABLE" as const,
      region: "WEST" as const,
      lastServiceOdometer: 65000,
    },
    {
      registrationNumber: "GJ01PQ7890",
      name: "Bajaj CT100 Courier",
      type: "BIKE" as const,
      maxLoadCapacity: 50,
      odometer: 8200,
      acquisitionCost: 65000,
      status: "AVAILABLE" as const,
      region: "CENTRAL" as const,
      lastServiceOdometer: 5000,
    },
    {
      registrationNumber: "RJ14ST2345",
      name: "Eicher Pro 3015",
      type: "TRUCK" as const,
      maxLoadCapacity: 9000,
      odometer: 152000,
      acquisitionCost: 2100000,
      status: "RETIRED" as const,
      region: "SOUTH" as const,
      lastServiceOdometer: 150000,
    },
    {
      registrationNumber: "MH20UV6789",
      name: "Mahindra Supro",
      type: "VAN" as const,
      maxLoadCapacity: 1200,
      odometer: 98000,
      acquisitionCost: 780000,
      status: "RETIRED" as const,
      region: "NORTH" as const,
      lastServiceOdometer: 95000,
    },
  ];

  const vehiclesByReg: Record<string, Vehicle> = {};
  for (const vehicle of demoVehicles) {
    vehiclesByReg[vehicle.registrationNumber] = await prisma.vehicle.upsert({
      where: { registrationNumber: vehicle.registrationNumber },
      update: {},
      create: vehicle,
    });
  }

  console.log(`   Seeded ${demoVehicles.length} demo vehicles (all types, all regions)`);

  // -------------------------------------------------------------------------
  // Driver  (Step 3 — Driver Management)
  // Every Region represented at least once. Only AVAILABLE/OFF_DUTY/
  // SUSPENDED seeded here — ON_TRIP only makes sense once Trip (Step 4)
  // exists to put a driver on one. Expiry dates computed relative to seed
  // run time (not hardcoded) so "expiring soon" stays meaningful whenever
  // this script is re-run.
  // -------------------------------------------------------------------------
  const DAY_MS = 24 * 60 * 60 * 1000;
  const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS);

  const demoDrivers = [
    {
      name: "Vikram Singh",
      licenseNumber: "DL-0420110012345",
      licenseCategory: "HMV",
      licenseExpiryDate: daysFromNow(365 * 1.5),
      contactNumber: "9876543210",
      safetyScore: 92,
      status: "AVAILABLE" as const,
      region: "NORTH" as const,
    },
    {
      name: "Anjali Nair",
      licenseNumber: "KA-0320150067890",
      licenseCategory: "LMV",
      licenseExpiryDate: daysFromNow(20), // expiring soon — email-reminder demo (Step 12)
      contactNumber: "9123456780",
      safetyScore: 88,
      status: "AVAILABLE" as const,
      region: "SOUTH" as const,
    },
    {
      name: "Ramesh Kumar",
      licenseNumber: "TN-0720180023456",
      licenseCategory: "HMV",
      licenseExpiryDate: daysFromNow(-60), // already expired — compliance case
      contactNumber: "9988776655",
      safetyScore: 65,
      status: "SUSPENDED" as const,
      region: "WEST" as const,
    },
    {
      name: "Fatima Sheikh",
      licenseNumber: "MH-1420190098765",
      licenseCategory: "LMV",
      licenseExpiryDate: daysFromNow(365 * 2),
      contactNumber: "9871234560",
      safetyScore: 95,
      status: "AVAILABLE" as const,
      region: "CENTRAL" as const,
    },
    {
      name: "Suresh Yadav",
      licenseNumber: "UP-3220170034567",
      licenseCategory: "MCWG",
      licenseExpiryDate: daysFromNow(365),
      contactNumber: "9012345678",
      safetyScore: 78,
      status: "OFF_DUTY" as const,
      region: "EAST" as const,
    },
    {
      name: "Deepak Joshi",
      licenseNumber: "RJ-1420160056789",
      licenseCategory: "HMV",
      licenseExpiryDate: daysFromNow(365 * 1.8),
      contactNumber: "9765432109",
      safetyScore: 100,
      status: "AVAILABLE" as const,
      region: "NORTH" as const,
    },
  ];

  const driversByLicense: Record<string, Driver> = {};
  for (const driver of demoDrivers) {
    driversByLicense[driver.licenseNumber] = await prisma.driver.upsert({
      where: { licenseNumber: driver.licenseNumber },
      update: {},
      create: driver,
    });
  }

  console.log(
    `   Seeded ${demoDrivers.length} demo drivers (all regions, one license expiring soon)`
  );

  // -------------------------------------------------------------------------
  // Route  (Step 15 — Named Routes)
  // Seed a handful of named routes (e.g. Mumbai–Pune, Delhi–Agra) so the
  // Trip creation form has options and route-profitability reporting (§7.7)
  // has data to show.
  // -------------------------------------------------------------------------
  // TODO (Step 15): seed named routes

  // -------------------------------------------------------------------------
  // Trip  (Step 4 — Trip Management)
  // One trip per status (DRAFT, DISPATCHED, HALTED, COMPLETED, CANCELLED)
  // so every lifecycle action has something to demo. Tracking numbers are
  // fixed (not the random TO-<id> the API generates) so this stays
  // idempotent across re-runs. Vehicle/driver side effects are applied
  // manually here to mirror what the real dispatch/complete transactions
  // would do — this bypasses the API, so nothing enforces that for us.
  // -------------------------------------------------------------------------
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * DAY_MS);

  const draftVehicle = vehiclesByReg["GJ01PQ7890"]!;
  const draftDriver = driversByLicense["MH-1420190098765"]!; // Fatima Sheikh

  const dispatchedVehicle = vehiclesByReg["MH12AB1234"]!;
  const dispatchedDriver = driversByLicense["DL-0420110012345"]!; // Vikram Singh

  const haltedVehicle = vehiclesByReg["TN09XY3456"]!;
  const haltedDriver = driversByLicense["RJ-1420160056789"]!; // Deepak Joshi

  const completedVehicle = vehiclesByReg["DL8CAF5678"]!;
  const completedDriver = driversByLicense["KA-0320150067890"]!; // Anjali Nair
  const completedFinalOdometer = Number(completedVehicle.odometer) + 140;

  const cancelledVehicle = vehiclesByReg["KA05MN9012"]!;
  const cancelledDriver = driversByLicense["MH-1420190098765"]!; // Fatima Sheikh (reused — never dispatched, so no conflict)

  const demoTrips = [
    {
      trackingNumber: "TO-SEED0001",
      source: "Ahmedabad Depot",
      destination: "Gandhinagar Hub",
      vehicleId: draftVehicle.id,
      driverId: draftDriver.id,
      cargoWeight: 30,
      plannedDistance: 25,
      revenue: 1200,
      status: "DRAFT" as const,
    },
    {
      trackingNumber: "TO-SEED0002",
      source: "Delhi Warehouse",
      destination: "Chandigarh Hub",
      vehicleId: dispatchedVehicle.id,
      driverId: dispatchedDriver.id,
      cargoWeight: 12000,
      plannedDistance: 250,
      revenue: 45000,
      status: "DISPATCHED" as const,
      dispatchedAt: twoDaysAgo,
    },
    {
      trackingNumber: "TO-SEED0003",
      source: "Chennai Port",
      destination: "Bangalore Depot",
      vehicleId: haltedVehicle.id,
      driverId: haltedDriver.id,
      cargoWeight: 20000,
      plannedDistance: 350,
      revenue: 78000,
      status: "HALTED" as const,
      dispatchedAt: twoDaysAgo,
      haltReason: "Vehicle breakdown — awaiting roadside assistance",
    },
    {
      trackingNumber: "TO-SEED0004",
      source: "Bangalore Hub",
      destination: "Mysore Depot",
      vehicleId: completedVehicle.id,
      driverId: completedDriver.id,
      cargoWeight: 1200,
      plannedDistance: 145,
      revenue: 8500,
      status: "COMPLETED" as const,
      dispatchedAt: twoDaysAgo,
      completedAt: now,
      actualDistance: 140,
      finalOdometer: completedFinalOdometer,
      fuelConsumed: 18,
    },
    {
      trackingNumber: "TO-SEED0005",
      source: "Kolkata Depot",
      destination: "Howrah Hub",
      vehicleId: cancelledVehicle.id,
      driverId: cancelledDriver.id,
      cargoWeight: 500,
      plannedDistance: 15,
      revenue: 900,
      status: "CANCELLED" as const,
    },
    {
      trackingNumber: "TO-SEED0006",
      source: "Mumbai Port",
      destination: "Pune Hub",
      vehicleId: completedVehicle.id,
      driverId: completedDriver.id,
      cargoWeight: 1400,
      plannedDistance: 150,
      revenue: 12000,
      status: "COMPLETED" as const,
      dispatchedAt: daysFromNow(-32),
      completedAt: daysFromNow(-30),
      actualDistance: 155,
      finalOdometer: completedFinalOdometer + 155,
      fuelConsumed: 22,
    },
    {
      trackingNumber: "TO-SEED0007",
      source: "Pune Hub",
      destination: "Goa Depot",
      vehicleId: completedVehicle.id,
      driverId: completedDriver.id,
      cargoWeight: 1000,
      plannedDistance: 400,
      revenue: 28000,
      status: "COMPLETED" as const,
      dispatchedAt: daysFromNow(-63),
      completedAt: daysFromNow(-60),
      actualDistance: 410,
      finalOdometer: completedFinalOdometer + 565,
      fuelConsumed: 60,
    },
    {
      trackingNumber: "TO-SEED0008",
      source: "Delhi Warehouse",
      destination: "Jaipur Hub",
      vehicleId: completedVehicle.id,
      driverId: completedDriver.id,
      cargoWeight: 1100,
      plannedDistance: 270,
      revenue: 18500,
      status: "COMPLETED" as const,
      dispatchedAt: daysFromNow(-92),
      completedAt: daysFromNow(-90),
      actualDistance: 275,
      finalOdometer: completedFinalOdometer + 840,
      fuelConsumed: 40,
    },
    {
      trackingNumber: "TO-SEED0009",
      source: "Jaipur Hub",
      destination: "Ahmedabad Depot",
      vehicleId: completedVehicle.id,
      driverId: completedDriver.id,
      cargoWeight: 900,
      plannedDistance: 650,
      revenue: 42000,
      status: "COMPLETED" as const,
      dispatchedAt: daysFromNow(-124),
      completedAt: daysFromNow(-120),
      actualDistance: 660,
      finalOdometer: completedFinalOdometer + 1500,
      fuelConsumed: 95,
    },
    {
      trackingNumber: "TO-SEED0010",
      source: "Chennai Port",
      destination: "Hyderabad Hub",
      vehicleId: completedVehicle.id,
      driverId: completedDriver.id,
      cargoWeight: 1300,
      plannedDistance: 630,
      revenue: 39000,
      status: "COMPLETED" as const,
      dispatchedAt: daysFromNow(-153),
      completedAt: daysFromNow(-150),
      actualDistance: 640,
      finalOdometer: completedFinalOdometer + 2140,
      fuelConsumed: 90,
    },
  ];

  for (const trip of demoTrips) {
    await prisma.trip.upsert({
      where: { trackingNumber: trip.trackingNumber },
      update: {},
      create: trip,
    });
  }

  // Vehicle/driver side effects that the real dispatch/complete/halt
  // transactions would have produced — applied directly since this seed
  // bypasses those endpoints.
  await prisma.vehicle.update({
    where: { id: dispatchedVehicle.id },
    data: { status: "ON_TRIP" },
  });
  await prisma.driver.update({
    where: { id: dispatchedDriver.id },
    data: { status: "ON_TRIP" },
  });

  await prisma.vehicle.update({ where: { id: haltedVehicle.id }, data: { status: "ON_TRIP" } });
  await prisma.driver.update({ where: { id: haltedDriver.id }, data: { status: "ON_TRIP" } });

  await prisma.vehicle.update({
    where: { id: completedVehicle.id },
    data: { odometer: completedFinalOdometer, status: "AVAILABLE" },
  });
  await prisma.driver.update({
    where: { id: completedDriver.id },
    data: { status: "AVAILABLE" },
  });

  // FuelLog has no natural unique key to upsert on — check for an existing
  // row against this trip before creating, so re-running seed doesn't pile
  // up duplicates (this mirrors what the real /complete transaction does,
  // just done by hand since we're bypassing the API here).
  const completedTrip = await prisma.trip.findUniqueOrThrow({
    where: { trackingNumber: "TO-SEED0004" },
  });
  const existingFuelLog = await prisma.fuelLog.findFirst({
    where: { tripId: completedTrip.id },
  });
  if (!existingFuelLog) {
    await prisma.fuelLog.create({
      data: {
        vehicleId: completedVehicle.id,
        tripId: completedTrip.id,
        liters: 18,
        cost: 0,
        date: now,
      },
    });
  }

  console.log(`   Seeded ${demoTrips.length} demo trips (one per status)`);

  // -------------------------------------------------------------------------
  // MaintenanceLog  (Step 5 — Maintenance Workflow)
  // One OPEN record (its vehicle flipped to IN_SHOP, so the "Vehicles in
  // Maintenance" KPI is non-zero) and one CLOSED record for history.
  // MaintenanceLog has no natural unique key, so we key idempotency off a
  // distinctive description via findFirst, and apply the IN_SHOP side
  // effect by hand — the seed bypasses the API transaction that would
  // normally produce it.
  // -------------------------------------------------------------------------
  const openMaintVehicle = vehiclesByReg["KA05MN9012"]!; // Tata Ace Gold
  const closedMaintVehicle = vehiclesByReg["DL8CAF5678"]!; // Mahindra Bolero

  const OPEN_MAINT_DESC = "Brake pad replacement and full inspection";
  const CLOSED_MAINT_DESC = "Scheduled 20,000 km service";

  const existingOpenMaint = await prisma.maintenanceLog.findFirst({
    where: { description: OPEN_MAINT_DESC },
  });
  if (!existingOpenMaint) {
    await prisma.maintenanceLog.create({
      data: {
        vehicleId: openMaintVehicle.id,
        description: OPEN_MAINT_DESC,
        cost: 8500,
        status: "OPEN",
      },
    });
  }
  await prisma.vehicle.update({
    where: { id: openMaintVehicle.id },
    data: { status: "IN_SHOP" },
  });

  const existingClosedMaint = await prisma.maintenanceLog.findFirst({
    where: { description: CLOSED_MAINT_DESC },
  });
  if (!existingClosedMaint) {
    await prisma.maintenanceLog.create({
      data: {
        vehicleId: closedMaintVehicle.id,
        description: CLOSED_MAINT_DESC,
        cost: 12000,
        status: "CLOSED",
        closedAt: twoDaysAgo,
      },
    });
  }

  console.log("   Seeded 2 maintenance logs (1 OPEN → vehicle IN_SHOP, 1 CLOSED)");

  // -------------------------------------------------------------------------
  // FuelLog  (Step 6 — Fuel & Expense Logging)
  // The completed trip (TO-SEED0004) already produced one trip-linked fuel
  // log. Here we add a handful of standalone (tripId = null) logs across
  // vehicles so operational-cost / fuel-efficiency queries (Steps 7-8, 10)
  // have data. No natural unique key, so gate on "no standalone logs yet."
  // -------------------------------------------------------------------------
  const standaloneFuelCount = await prisma.fuelLog.count({ where: { tripId: null } });
  if (standaloneFuelCount === 0) {
    await prisma.fuelLog.createMany({
      data: [
        { vehicleId: vehiclesByReg["MH12AB1234"]!.id, liters: 180, cost: 18000, date: daysFromNow(-5) },
        { vehicleId: vehiclesByReg["MH12AB1234"]!.id, liters: 165, cost: 16800, date: daysFromNow(-12) },
        { vehicleId: vehiclesByReg["TN09XY3456"]!.id, liters: 240, cost: 24500, date: daysFromNow(-3) },
        { vehicleId: vehiclesByReg["DL8CAF5678"]!.id, liters: 45, cost: 4600, date: daysFromNow(-8) },
        { vehicleId: vehiclesByReg["GJ01PQ7890"]!.id, liters: 6, cost: 620, date: daysFromNow(-2) },
      ],
    });
  }

  const fuelCount = await prisma.fuelLog.count();
  console.log(`   Seeded standalone fuel logs (${fuelCount} fuel logs total incl. trip-linked)`);

  // -------------------------------------------------------------------------
  // Expense  (Step 6 — Fuel & Expense Logging)
  // TOLL, MAINTENANCE, and OTHER samples across vehicles so operational-cost
  // aggregation (§3.7) and anomaly flags (§3.11) have data. Expenses start
  // empty, so gate idempotency on the table being empty.
  // -------------------------------------------------------------------------
  const expenseCount = await prisma.expense.count();
  if (expenseCount === 0) {
    await prisma.expense.createMany({
      data: [
        { vehicleId: vehiclesByReg["MH12AB1234"]!.id, type: "TOLL", amount: 1250, date: daysFromNow(-5), description: "NH-48 toll plazas" },
        { vehicleId: vehiclesByReg["TN09XY3456"]!.id, type: "TOLL", amount: 2100, date: daysFromNow(-3), description: "Chennai–Bangalore corridor" },
        { vehicleId: vehiclesByReg["DL8CAF5678"]!.id, type: "MAINTENANCE", amount: 3400, date: daysFromNow(-8), description: "Tyre rotation" },
        { vehicleId: vehiclesByReg["MH12AB1234"]!.id, type: "OTHER", amount: 800, date: daysFromNow(-6), description: "Driver allowance" },
        { vehicleId: vehiclesByReg["GJ01PQ7890"]!.id, type: "OTHER", amount: 300, date: daysFromNow(-2), description: "Parking" },
      ],
    });
  }

  const finalExpenseCount = await prisma.expense.count();
  console.log(`   Seeded ${finalExpenseCount} expenses (TOLL, MAINTENANCE, OTHER)`);

  console.log(
    "✅ TransitOps seed — users, vehicles, drivers, trips, maintenance, fuel & expenses seeded (Steps 1-6).\n" +
      "   Remaining sections above will be filled in as their feature branch lands."
  );
}

main()
  .catch((error: unknown) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
