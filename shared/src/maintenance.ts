import { z } from "zod";

// ---------------------------------------------------------------------------
// Maintenance mutation schema — Step 5 (Maintenance Workflow), Technical
// Requirements §3.6. Only the fields the client supplies at open time:
// status (OPEN), openedAt (now), and the vehicle's IN_SHOP flip are all
// server-controlled. Closing takes no body (POST /:id/close).
// ---------------------------------------------------------------------------

export const maintenanceCreateSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  description: z.string().min(1, "Description is required"),
  cost: z.coerce
    .number({ invalid_type_error: "Cost must be a number" })
    .nonnegative("Cost must be zero or greater"),
});
export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;
