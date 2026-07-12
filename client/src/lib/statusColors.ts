import type { VehicleStatus, DriverStatus, TripStatus } from "@transitops/shared";

// Vehicle status → badge color scheme (Technical Requirements §3.9).
// Reused as-is by the Map view (Step 9) for marker colors, so keep this the
// single source of truth rather than re-deriving colors per component.
export const VEHICLE_STATUS_STYLES: Record<VehicleStatus, string> = {
  AVAILABLE: "bg-green-500/10 text-green-400 border-green-500/20",
  ON_TRIP: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  IN_SHOP: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  RETIRED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

// Driver status → badge color scheme. Not specified in §3.9 (that scheme
// covers Vehicle only), so extended with the same visual language: green
// for available, blue for on-trip, grey for inactive, red for a compliance
// flag (SUSPENDED) — matching the Safety Officer's compliance-focused view.
export const DRIVER_STATUS_STYLES: Record<DriverStatus, string> = {
  AVAILABLE: "bg-green-500/10 text-green-400 border-green-500/20",
  ON_TRIP: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  OFF_DUTY: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  SUSPENDED: "bg-red-500/10 text-red-400 border-red-500/20",
};

// Trip status → badge color scheme (Process Flow §3 Trip state machine).
export const TRIP_STATUS_STYLES: Record<TripStatus, string> = {
  DRAFT: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  DISPATCHED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  HALTED: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-green-500/10 text-green-400 border-green-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
};
