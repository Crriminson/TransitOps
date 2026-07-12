import { z } from "zod";
import { VehicleTypeEnum, RegionEnum } from "./enums";

// ---------------------------------------------------------------------------
// Vehicle mutation schemas — Step 2 (Vehicle Registry), Technical
// Requirements §3.3/§4. Deliberately excludes `status` and
// `lastServiceOdometer` — both are server-controlled (set on create,
// changed only via the dedicated retire endpoint or maintenance workflow),
// never client-settable.
// ---------------------------------------------------------------------------

const registrationNumber = z.string().min(1, "Registration number is required");
const name = z.string().min(1, "Name is required");
const type = VehicleTypeEnum;
const maxLoadCapacity = z.coerce
  .number({ invalid_type_error: "Max load capacity must be a number" })
  .positive("Max load capacity must be greater than 0");
const acquisitionCost = z.coerce
  .number({ invalid_type_error: "Acquisition cost must be a number" })
  .positive("Acquisition cost must be greater than 0");
const region = RegionEnum;

// No default here — reused as-is by vehicleUpdateSchema, where an omitted
// odometer must mean "leave unchanged," not "reset to 0."
const odometer = z.coerce
  .number({ invalid_type_error: "Odometer must be a number" })
  .min(0, "Odometer must be zero or greater");

export const vehicleCreateSchema = z.object({
  registrationNumber,
  name,
  type,
  maxLoadCapacity,
  odometer: odometer.default(0),
  acquisitionCost,
  region,
});
export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;

export const vehicleUpdateSchema = z
  .object({
    registrationNumber,
    name,
    type,
    maxLoadCapacity,
    odometer,
    acquisitionCost,
    region,
  })
  .partial();
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
