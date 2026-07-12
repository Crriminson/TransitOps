import { z } from "zod";

// ---------------------------------------------------------------------------
// Fuel log mutation schema — Step 6 (Fuel & Expense), Technical Requirements
// §3.7. A standalone fuel log is keyed to a vehicle; tripId is optional (the
// trip-completion flow, §4.2, sets it, but a manual entry needn't).
// ---------------------------------------------------------------------------

export const fuelLogCreateSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  tripId: z.string().optional(),
  liters: z.coerce
    .number({ invalid_type_error: "Liters must be a number" })
    .positive("Liters must be greater than 0"),
  cost: z.coerce
    .number({ invalid_type_error: "Cost must be a number" })
    .nonnegative("Cost must be zero or greater"),
  date: z.coerce.date({ invalid_type_error: "Date must be valid" }),
});
export type FuelLogCreateInput = z.infer<typeof fuelLogCreateSchema>;
