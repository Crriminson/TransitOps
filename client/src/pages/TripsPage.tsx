import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tripCreateSchema, type TripCreateInput, type TripCompleteInput } from "@transitops/shared";
import {
  fetchTrips,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
  haltTrip,
  resumeTrip,
} from "../lib/trips";
import { fetchAvailableVehicles } from "../lib/vehicles";
import { fetchAvailableDrivers } from "../lib/drivers";
import { useAuthStore } from "../store/authStore";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import ReasonDialog from "../components/ReasonDialog";
import CompleteTripDialog from "../components/trips/CompleteTripDialog";
import { TRIP_STATUS_STYLES } from "../lib/statusColors";
import Pagination from "../components/Pagination";
import type { Trip } from "../types/trip";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";


const PAGE_SIZE = 10;

export default function TripsPage() {
  const role = useAuthStore((state) => state.user?.role);
  const canWrite = role === "FLEET_MANAGER" || role === "DRIVER";
  const queryClient = useQueryClient();

  const {
    data: trips,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["trips"], queryFn: fetchTrips });

  const { data: availableVehicles } = useQuery({
    queryKey: ["vehicles", "available"],
    queryFn: fetchAvailableVehicles,
  });
  const { data: availableDrivers } = useQuery({
    queryKey: ["drivers", "available"],
    queryFn: fetchAvailableDrivers,
  });

  const [cancelTarget, setCancelTarget] = useState<Trip | null>(null);
  const [haltTarget, setHaltTarget] = useState<Trip | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Trip | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery] = useState("");

  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    if (!searchQuery) return trips;
    const lowerQuery = searchQuery.toLowerCase();
    return trips.filter((t) => 
      t.trackingNumber.toLowerCase().includes(lowerQuery) ||
      t.source.toLowerCase().includes(lowerQuery) ||
      t.destination.toLowerCase().includes(lowerQuery)
    );
  }, [trips, searchQuery]);

  const paginatedTrips = filteredTrips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const invalidateTrips = () => queryClient.invalidateQueries({ queryKey: ["trips"] });

  // Trip Actions
  const createMutation = useMutation({
    mutationFn: (data: TripCreateInput) => createTrip(data),
    onSuccess: () => {
      invalidateTrips();
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      reset(); // Reset form
    },
  });
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

  // Create Trip Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripCreateInput>({ resolver: zodResolver(tripCreateSchema) });

  const watchVehicleId = watch("vehicleId");
  const watchCargoWeight = watch("cargoWeight");

  const selectedVehicle = availableVehicles?.find(v => v.id === watchVehicleId);
  
  // Custom capacity check
  const capacityExceeded = selectedVehicle && watchCargoWeight && Number(watchCargoWeight) > selectedVehicle.maxLoadCapacity;
  const capacityDiff = capacityExceeded ? Number(watchCargoWeight) - selectedVehicle.maxLoadCapacity : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Trip Dispatcher</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Pane: Create Trip Form */}
        {canWrite && (
          <div className="space-y-6 lg:border-r border-[var(--border-color)] lg:pr-8">
            
            {/* Visual Lifecycle Indicator */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Trip Lifecycle</h2>
              <div className="flex items-center justify-between relative px-2">
                <div className="absolute top-2 left-2 right-2 h-0.5 bg-[var(--border-color)] -z-10" />
                <div className="flex flex-col items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-green-500 ring-4 ring-[var(--bg-primary)]" />
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">Draft</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-blue-500 ring-4 ring-[var(--bg-primary)]" />
                  <span className="text-[10px] text-blue-400 font-medium">Dispatched</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-[var(--text-secondary)] ring-4 ring-[var(--bg-primary)]" />
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">Completed</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-4 h-4 rounded-full bg-[var(--text-secondary)] ring-4 ring-[var(--bg-primary)]" />
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">Cancelled</span>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit((data) => createMutation.mutate(data))}
              noValidate
              className="space-y-4"
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Create Trip</h2>

              {createMutation.isError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-[var(--radius)] px-3 py-2">
                  Could not create trip. Check inputs.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Source</label>
                <Input {...register("source")} placeholder="e.g. Gandhinagar Depot" className="bg-[var(--bg-primary)]" />
                {errors.source && <p className="text-xs text-red-400">{errors.source.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Destination</label>
                <Input {...register("destination")} placeholder="e.g. Ahmedabad Hub" className="bg-[var(--bg-primary)]" />
                {errors.destination && <p className="text-xs text-red-400">{errors.destination.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold flex items-center justify-between">
                  <span>Vehicle (Available Only)</span>
                  {selectedVehicle && (
                    <span className="text-[10px] text-green-400 normal-case tracking-normal">Cap: {selectedVehicle.maxLoadCapacity} kg</span>
                  )}
                </label>
                <Select value={watchVehicleId || ""} onValueChange={(val: string) => setValue("vehicleId", val, { shouldValidate: true })}>
                  <SelectTrigger className="bg-[var(--bg-primary)]">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registrationNumber} — {v.name} ({v.maxLoadCapacity} kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vehicleId && <p className="text-xs text-red-400">{errors.vehicleId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Driver (Available Only)</label>
                <Select value={watch("driverId") || ""} onValueChange={(val: string) => setValue("driverId", val, { shouldValidate: true })}>
                  <SelectTrigger className="bg-[var(--bg-primary)]">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDrivers?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.licenseNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.driverId && <p className="text-xs text-red-400">{errors.driverId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Cargo Weight (kg)</label>
                <Input type="number" step="any" {...register("cargoWeight")} placeholder="e.g. 700" className="bg-[var(--bg-primary)]" />
                {errors.cargoWeight && <p className="text-xs text-red-400">{errors.cargoWeight.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Planned Distance (km)</label>
                <Input type="number" step="any" {...register("plannedDistance")} placeholder="e.g. 38" className="bg-[var(--bg-primary)]" />
                {errors.plannedDistance && <p className="text-xs text-red-400">{errors.plannedDistance.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Expected Revenue ($)</label>
                <Input type="number" step="any" {...register("revenue")} placeholder="e.g. 500" className="bg-[var(--bg-primary)]" />
                {errors.revenue && <p className="text-xs text-red-400">{errors.revenue.message}</p>}
              </div>

              {capacityExceeded && (
                <div className="text-xs p-3 rounded-[var(--radius)] border border-red-500/30 bg-red-500/10 text-red-400 space-y-1">
                  <div className="font-medium">Vehicle Capacity: {selectedVehicle.maxLoadCapacity} kg</div>
                  <div>Cargo Weight: {watchCargoWeight} kg</div>
                  <div className="font-bold flex items-center gap-1 mt-1">
                    <span className="text-lg leading-none">×</span> Capacity exceeded by {capacityDiff} kg — dispatch blocked
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending || !!capacityExceeded}
                  className="flex-1 btn-primary"
                >
                  Create Trip
                </Button>
                <Button
                  type="button"
                  onClick={() => reset()}
                  variant="outline"
                  className="flex-1 text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-primary)]"
                >
                  Clear
                </Button>
              </div>
              
              <p className="text-[11px] text-[var(--text-secondary)] text-center pt-2">
                On Complete: odometer → fuel log → expenses → Vehicle & Driver Available
              </p>
            </form>
          </div>
        )}

        {/* Right Pane: Live Board */}
        <div className={canWrite ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Live Board</h2>

          {isLoading && <p className="text-[var(--text-secondary)] text-sm">Loading trips…</p>}
          {isError && <p className="text-red-400 text-sm">Failed to load trips.</p>}

          <div className="space-y-3">
            {paginatedTrips.map((trip) => (
              <Card key={trip.id} className="p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] border-dashed hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{trip.trackingNumber}</span>
                    <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                      {trip.vehicle.registrationNumber} / {trip.driver.name}
                    </span>
                  </div>
                  <div className="text-[15px] font-medium text-[var(--text-primary)]">
                    {trip.source} → {trip.destination}
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <StatusBadge status={trip.status} className={TRIP_STATUS_STYLES[trip.status]} />
                    {trip.status === "HALTED" && trip.haltReason && (
                      <span className="text-xs font-semibold text-amber-500">{trip.haltReason}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-between items-start sm:items-end gap-3 min-w-[120px]">
                  <div className="text-sm font-medium text-[var(--text-secondary)]">
                    {trip.status === "DISPATCHED" ? "ETA: 45 min" : (trip.status === "DRAFT" ? "Awaiting Dispatch" : "—")}
                  </div>
                  
                  {canWrite && (
                    <div className="flex items-center gap-2">
                      {trip.status === "DRAFT" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => dispatchMutation.mutate(trip.id)}
                            className="h-7 text-xs bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            Dispatch
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCancelTarget(trip)}
                            className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {trip.status === "DISPATCHED" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setHaltTarget(trip)}
                            className="h-7 text-xs text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                          >
                            Halt
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setCompleteTarget(trip)}
                            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                          >
                            Complete
                          </Button>
                        </>
                      )}
                      {trip.status === "HALTED" && (
                        <Button
                          size="sm"
                          onClick={() => resumeMutation.mutate(trip.id)}
                          className="h-7 text-xs bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          Resume
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
            
            {filteredTrips.length === 0 && (
              <div className="p-8 text-center border border-[var(--border-color)] rounded-[var(--radius)] bg-[var(--bg-primary)] border-dashed">
                <p className="text-[var(--text-secondary)]">No trips match your search.</p>
              </div>
            )}
          </div>
          
          {filteredTrips.length > 0 && (
            <Pagination
              currentPage={page}
              totalItems={filteredTrips.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>

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
