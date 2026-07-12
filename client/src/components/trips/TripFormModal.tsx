import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tripCreateSchema, type TripCreateInput } from "@transitops/shared";
import { createTrip } from "../../lib/trips";
import { fetchAvailableVehicles } from "../../lib/vehicles";
import { fetchAvailableDrivers } from "../../lib/drivers";

interface TripFormModalProps {
  onClose: () => void;
}

const inputClass =
  "w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-slate-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// Create-only (Trip has no generic edit endpoint — lifecycle actions own
// every subsequent state change). Vehicle/driver dropdowns are the
// server-filtered "available pool" (Process Flow: creates a trip ...
// from available-vehicle/available-driver pools).
export default function TripFormModal({ onClose }: TripFormModalProps) {
  const queryClient = useQueryClient();

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles", "available"],
    queryFn: fetchAvailableVehicles,
  });
  const { data: drivers } = useQuery({
    queryKey: ["drivers", "available"],
    queryFn: fetchAvailableDrivers,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TripCreateInput>({ resolver: zodResolver(tripCreateSchema) });

  const mutation = useMutation({
    mutationFn: (data: TripCreateInput) => createTrip(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        noValidate
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-slate-100">Create Trip</h2>

        {mutation.isError && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            Something went wrong. Please try again.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Source" error={errors.source?.message}>
            <input {...register("source")} className={inputClass} />
          </Field>

          <Field label="Destination" error={errors.destination?.message}>
            <input {...register("destination")} className={inputClass} />
          </Field>

          <Field label="Vehicle" error={errors.vehicleId?.message}>
            <select {...register("vehicleId")} className={inputClass}>
              <option value="">Select an available vehicle</option>
              {vehicles?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} — {v.name} ({v.maxLoadCapacity.toLocaleString()} kg)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Driver" error={errors.driverId?.message}>
            <select {...register("driverId")} className={inputClass}>
              <option value="">Select an available driver</option>
              {drivers?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.licenseNumber})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Cargo Weight (kg)" error={errors.cargoWeight?.message}>
            <input type="number" step="any" {...register("cargoWeight")} className={inputClass} />
          </Field>

          <Field label="Planned Distance (km)" error={errors.plannedDistance?.message}>
            <input type="number" step="any" {...register("plannedDistance")} className={inputClass} />
          </Field>

          <Field label="Revenue" error={errors.revenue?.message}>
            <input type="number" step="any" {...register("revenue")} className={inputClass} />
          </Field>

          <Field label="LR Number (optional)" error={errors.lrNumber?.message}>
            <input {...register("lrNumber")} className={inputClass} />
          </Field>

          <Field label="Parcel Count (optional)" error={errors.parcelCount?.message}>
            <input type="number" step="1" {...register("parcelCount")} className={inputClass} />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            Create Trip
          </button>
        </div>
      </form>
    </div>
  );
}
