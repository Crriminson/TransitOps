import { z } from "zod";

// ---------------------------------------------------------------------------
// Trip mutation schemas — Step 4 (Trip Management), Technical Requirements
// §3.5/§4. tripCreateSchema deliberately excludes status, trackingNumber,
// actualDistance, finalOdometer, fuelConsumed, dispatchedAt/completedAt,
// haltReason, and routeId (Named Routes doesn't exist yet, Step 15) — all
// server/lifecycle-controlled, never client-settable at creation.
// ---------------------------------------------------------------------------

export const tripCreateSchema = z.object({
  source: z.string().min(1, "Source is required"),
  destination: z.string().min(1, "Destination is required"),
  vehicleId: z.string().min(1, "Vehicle is required"),
  driverId: z.string().min(1, "Driver is required"),
  cargoWeight: z.coerce
    .number({ invalid_type_error: "Cargo weight must be a number" })
    .positive("Cargo weight must be greater than 0"),
  plannedDistance: z.coerce
    .number({ invalid_type_error: "Planned distance must be a number" })
    .positive("Planned distance must be greater than 0"),
  revenue: z.coerce
    .number({ invalid_type_error: "Revenue must be a number" })
    .nonnegative("Revenue must be zero or greater"),
  lrNumber: z.string().optional(),
  parcelCount: z.coerce
    .number({ invalid_type_error: "Parcel count must be a number" })
    .int("Parcel count must be a whole number")
    .nonnegative("Parcel count must be zero or greater")
    .optional(),
});
export type TripCreateInput = z.infer<typeof tripCreateSchema>;

// POST /api/trips/:id/complete — Process Flow §4.2 step 2: both required,
// both positive.
export const tripCompleteSchema = z.object({
  finalOdometer: z.coerce
    .number({ invalid_type_error: "Final odometer must be a number" })
    .positive("Final odometer must be greater than 0"),
  fuelConsumed: z.coerce
    .number({ invalid_type_error: "Fuel consumed must be a number" })
    .positive("Fuel consumed must be greater than 0"),
});
export type TripCompleteInput = z.infer<typeof tripCompleteSchema>;

// POST /api/trips/:id/halt — Process Flow §4.7: required non-empty string.
export const tripHaltSchema = z.object({
  haltReason: z.string().min(1, "Halt reason is required"),
});
export type TripHaltInput = z.infer<typeof tripHaltSchema>;
