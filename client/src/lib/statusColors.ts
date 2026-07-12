import type { VehicleStatus } from "@transitops/shared";

// Vehicle status → badge color scheme (Technical Requirements §3.9).
// Reused as-is by the Map view (Step 9) for marker colors, so keep this the
// single source of truth rather than re-deriving colors per component.
export const VEHICLE_STATUS_STYLES: Record<VehicleStatus, string> = {
  AVAILABLE: "bg-green-500/10 text-green-400 border-green-500/20",
  ON_TRIP: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  IN_SHOP: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  RETIRED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};
