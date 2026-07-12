import { z } from "zod";
import { RegionEnum } from "./enums";

// ---------------------------------------------------------------------------
// Driver mutation schemas — Step 3 (Driver Management), Technical
// Requirements §3.4/§4. Deliberately excludes `status` — server-controlled
// (set on create, changed only via the dedicated status-transition endpoint
// or, in a later step, Trip dispatch/complete) — and `licenseExpired`, which
// is never stored, only computed at query time from `licenseExpiryDate`.
// ---------------------------------------------------------------------------

const name = z.string().min(1, "Name is required");
const licenseNumber = z.string().min(1, "License number is required");
const licenseCategory = z.string().min(1, "License category is required");
const licenseExpiryDate = z.coerce.date({
  invalid_type_error: "License expiry date must be a valid date",
});
const contactNumber = z.string().min(7, "Contact number looks too short");
const region = RegionEnum;

// No default here — reused as-is by driverUpdateSchema, where an omitted
// safetyScore must mean "leave unchanged," not "reset to 100."
const safetyScore = z.coerce
  .number({ invalid_type_error: "Safety score must be a number" })
  .int("Safety score must be a whole number")
  .min(0, "Safety score must be between 0 and 100")
  .max(100, "Safety score must be between 0 and 100");

export const driverCreateSchema = z.object({
  name,
  licenseNumber,
  licenseCategory,
  licenseExpiryDate,
  contactNumber,
  safetyScore: safetyScore.default(100),
  region,
});
export type DriverCreateInput = z.infer<typeof driverCreateSchema>;

export const driverUpdateSchema = z
  .object({
    name,
    licenseNumber,
    licenseCategory,
    licenseExpiryDate,
    contactNumber,
    safetyScore,
    region,
  })
  .partial();
export type DriverUpdateInput = z.infer<typeof driverUpdateSchema>;

// POST /api/drivers/:id/status — restricted to the "manual" transitions
// (Process Flow §3 Driver state machine). ON_TRIP is deliberately excluded:
// that transition belongs to Trip dispatch/complete (Step 4), not a
// standalone status edit.
export const driverStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "OFF_DUTY", "SUSPENDED"]),
});
export type DriverStatusInput = z.infer<typeof driverStatusSchema>;
