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

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 TransitOps seed — starting...");

  // -------------------------------------------------------------------------
  // User  (Step 1 — Auth + RBAC)
  // Seed one demo user per role: FLEET_MANAGER, DRIVER, SAFETY_OFFICER,
  // FINANCIAL_ANALYST. Passwords hashed with bcrypt (cost 10).
  // -------------------------------------------------------------------------
  // TODO (Step 1): seed demo users

  // -------------------------------------------------------------------------
  // Vehicle  (Step 2 — Vehicle Registry)
  // Seed a realistic mix of vehicles across types, statuses, and regions so
  // all dashboard KPI cards are non-zero and map markers have variety.
  // -------------------------------------------------------------------------
  // TODO (Step 2): seed demo vehicles

  // -------------------------------------------------------------------------
  // Driver  (Step 3 — Driver Management)
  // Seed drivers across statuses and regions; include at least one with a
  // license expiring within 30 days for the email-reminder demo (Step 12).
  // -------------------------------------------------------------------------
  // TODO (Step 3): seed demo drivers

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
    "✅ TransitOps seed — no seed data yet (Phase 0 skeleton).\n" +
      "   Each section above will be filled in as its feature branch lands."
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
