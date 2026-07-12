import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TripCompleteInput } from "@transitops/shared";
import {
  fetchTrips,
  dispatchTrip,
  completeTrip,
  cancelTrip,
  haltTrip,
  resumeTrip,
} from "../lib/trips";
import { useAuthStore } from "../store/authStore";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import ReasonDialog from "../components/ReasonDialog";
import TripFormModal from "../components/trips/TripFormModal";
import CompleteTripDialog from "../components/trips/CompleteTripDialog";
import { TRIP_STATUS_STYLES } from "../lib/statusColors";
import type { Trip } from "../types/trip";

export default function TripsPage() {
  const role = useAuthStore((state) => state.user?.role);
  const canWrite = role === "FLEET_MANAGER" || role === "DRIVER";
  const queryClient = useQueryClient();

  const {
    data: trips,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["trips"], queryFn: fetchTrips });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Trip | null>(null);
  const [haltTarget, setHaltTarget] = useState<Trip | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Trip | null>(null);

  const invalidateTrips = () => queryClient.invalidateQueries({ queryKey: ["trips"] });

  const dispatchMutation = useMutation({
    mutationFn: (id: string) => dispatchTrip(id),
    onSuccess: invalidateTrips,
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelTrip(id),
    onSuccess: () => {
      invalidateTrips();
      setCancelTarget(null);
    },
  });
  const haltMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => haltTrip(id, reason),
    onSuccess: () => {
      invalidateTrips();
      setHaltTarget(null);
    },
  });
  const resumeMutation = useMutation({
    mutationFn: (id: string) => resumeTrip(id),
    onSuccess: invalidateTrips,
  });
  const completeMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: TripCompleteInput }) =>
      completeTrip(id, input),
    onSuccess: () => {
      invalidateTrips();
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setCompleteTarget(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Trips</h1>
        {canWrite && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Create Trip
          </button>
        )}
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Loading trips…</p>}
      {isError && <p className="text-red-400 text-sm">Failed to load trips.</p>}

      {trips && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Tracking #</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Cargo (kg)</th>
                <th className="px-4 py-3">Distance (km)</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Status</th>
                {canWrite && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {trips.map((trip) => (
                <tr key={trip.id} className="text-slate-200">
                  <td className="px-4 py-3 font-mono text-xs">{trip.trackingNumber}</td>
                  <td className="px-4 py-3">
                    {trip.source} → {trip.destination}
                  </td>
                  <td className="px-4 py-3">{trip.vehicle.registrationNumber}</td>
                  <td className="px-4 py-3">{trip.driver.name}</td>
                  <td className="px-4 py-3">{trip.cargoWeight.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {trip.actualDistance !== null
                      ? `${trip.actualDistance.toLocaleString()} (actual)`
                      : trip.plannedDistance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{trip.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge
                        status={trip.status}
                        className={TRIP_STATUS_STYLES[trip.status]}
                      />
                      {trip.status === "HALTED" && trip.haltReason && (
                        <span className="text-xs text-amber-400">{trip.haltReason}</span>
                      )}
                    </div>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {trip.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() => dispatchMutation.mutate(trip.id)}
                              className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                            >
                              Dispatch
                            </button>
                            <button
                              onClick={() => setCancelTarget(trip)}
                              className="text-red-400 hover:text-red-300 text-xs font-medium"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {trip.status === "DISPATCHED" && (
                          <>
                            <button
                              onClick={() => setHaltTarget(trip)}
                              className="text-amber-400 hover:text-amber-300 text-xs font-medium"
                            >
                              Halt
                            </button>
                            <button
                              onClick={() => setCompleteTarget(trip)}
                              className="text-green-400 hover:text-green-300 text-xs font-medium"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => setCancelTarget(trip)}
                              className="text-red-400 hover:text-red-300 text-xs font-medium"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {trip.status === "HALTED" && (
                          <button
                            onClick={() => resumeMutation.mutate(trip.id)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateForm && <TripFormModal onClose={() => setShowCreateForm(false)} />}

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancel this trip?"
        description={`"${cancelTarget?.trackingNumber}" will be cancelled${
          cancelTarget?.status === "DISPATCHED"
            ? " and its vehicle/driver freed up again"
            : ""
        }.`}
        confirmLabel="Cancel Trip"
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)}
      />

      <ReasonDialog
        open={haltTarget !== null}
        title="Halt this trip?"
        description={`"${haltTarget?.trackingNumber}" will be marked HALTED. The vehicle and driver stay committed to this trip.`}
        label="Halt reason"
        confirmLabel="Halt"
        onConfirm={(reason) => haltTarget && haltMutation.mutate({ id: haltTarget.id, reason })}
        onCancel={() => setHaltTarget(null)}
      />

      <CompleteTripDialog
        open={completeTarget !== null}
        currentOdometer={completeTarget?.vehicle.odometer ?? 0}
        onConfirm={(input) =>
          completeTarget && completeMutation.mutate({ id: completeTarget.id, input })
        }
        onCancel={() => setCompleteTarget(null)}
      />
    </div>
  );
}
