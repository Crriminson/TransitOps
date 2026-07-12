import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums — mirroring every Prisma enum in schema.prisma exactly.
// These are the single source of truth for enum values shared between
// client (form validation) and server (request validation).
// Per-entity mutation schemas land with each feature branch (Steps 1–15).
// ---------------------------------------------------------------------------

export const UserRoleEnum = z.enum([
  "FLEET_MANAGER",
  "DRIVER",
  "SAFETY_OFFICER",
  "FINANCIAL_ANALYST",
]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const VehicleTypeEnum = z.enum([
  "TRUCK",
  "VAN",
  "MINI_TRUCK",
  "TRAILER",
  "BIKE",
]);
export type VehicleType = z.infer<typeof VehicleTypeEnum>;

export const VehicleStatusEnum = z.enum([
  "AVAILABLE",
  "ON_TRIP",
  "IN_SHOP",
  "RETIRED",
]);
export type VehicleStatus = z.infer<typeof VehicleStatusEnum>;

export const DriverStatusEnum = z.enum([
  "AVAILABLE",
  "ON_TRIP",
  "OFF_DUTY",
  "SUSPENDED",
]);
export type DriverStatus = z.infer<typeof DriverStatusEnum>;

export const TripStatusEnum = z.enum([
  "DRAFT",
  "DISPATCHED",
  "HALTED",
  "COMPLETED",
  "CANCELLED",
]);
export type TripStatus = z.infer<typeof TripStatusEnum>;

export const MaintenanceLogStatusEnum = z.enum(["OPEN", "CLOSED"]);
export type MaintenanceLogStatus = z.infer<typeof MaintenanceLogStatusEnum>;

export const ExpenseTypeEnum = z.enum(["TOLL", "MAINTENANCE", "OTHER"]);
export type ExpenseType = z.infer<typeof ExpenseTypeEnum>;

export const RegionEnum = z.enum([
  "NORTH",
  "SOUTH",
  "EAST",
  "WEST",
  "CENTRAL",
]);
export type Region = z.infer<typeof RegionEnum>;

// ---------------------------------------------------------------------------
// Trivial proof-of-resolution schema — confirms the package is importable
// and working from both client and server. Remove after Phase 0 verification.
// ---------------------------------------------------------------------------
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
