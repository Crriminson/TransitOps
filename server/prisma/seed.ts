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

import { PrismaClient } from "@prisma/client";
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

  for (const vehicle of demoVehicles) {
    await prisma.vehicle.upsert({
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

  for (const driver of demoDrivers) {
    await prisma.driver.upsert({
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
  // Seed trips across statuses (COMPLETED, DISPATCHED, HALTED, DRAFT) so
  // every dashboard KPI card and the map have data to display.
  // At least one COMPLETED trip per vehicle for fuel-efficiency / ROI.
  // -------------------------------------------------------------------------
  // TODO (Step 4): seed demo trips

  // -------------------------------------------------------------------------
  // MaintenanceLog  (Step 5 — Maintenance Workflow)
  // Seed at least one OPEN and one CLOSED record so the dashboard's
  // "Vehicles in Maintenance" card is non-zero and the predictive
  // maintenance nudge (Step 11) has lastServiceOdometer data.
  // -------------------------------------------------------------------------
  // TODO (Step 5): seed maintenance logs

  // -------------------------------------------------------------------------
  // FuelLog  (Step 6 — Fuel & Expense Logging)
  // Linked to completed trips; feeds fuel-efficiency and Vehicle ROI
  // calculations. One FuelLog per COMPLETED trip at minimum.
  // -------------------------------------------------------------------------
  // TODO (Step 6): seed fuel logs

  // -------------------------------------------------------------------------
  // Expense  (Step 6 — Fuel & Expense Logging)
  // TOLL, MAINTENANCE, and OTHER samples per vehicle so operational-cost
  // aggregation (§3.7) and anomaly flags (§3.11) have data.
  // -------------------------------------------------------------------------
  // TODO (Step 6): seed expenses

  console.log(
    "✅ TransitOps seed — demo users, vehicles, drivers seeded (Steps 1-3).\n" +
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
