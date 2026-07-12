import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  vehicleCreateSchema,
  VehicleTypeEnum,
  RegionEnum,
  type VehicleCreateInput,
} from "@transitops/shared";
import { createVehicle, updateVehicle } from "../../lib/vehicles";
import type { Vehicle } from "../../types/vehicle";

interface VehicleFormModalProps {
  mode: "create" | "edit";
  vehicle?: Vehicle;
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

// Shares vehicleCreateSchema as the form resolver in both modes — the form
// always collects a full set of fields (edit mode pre-fills every field
// from the existing vehicle), so create-schema validation applies equally.
// A fully-populated VehicleCreateInput is structurally assignable to the
// partial VehicleUpdateInput the PATCH endpoint expects.
export default function VehicleFormModal({ mode, vehicle, onClose }: VehicleFormModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VehicleCreateInput>({
    resolver: zodResolver(vehicleCreateSchema),
    defaultValues: vehicle
      ? {
          registrationNumber: vehicle.registrationNumber,
          name: vehicle.name,
          type: vehicle.type,
          maxLoadCapacity: vehicle.maxLoadCapacity,
          odometer: vehicle.odometer,
          acquisitionCost: vehicle.acquisitionCost,
          region: vehicle.region,
        }
      : { odometer: 0 },
  });

  const mutation = useMutation<Vehicle, unknown, VehicleCreateInput>({
    mutationFn: (data) =>
      mode === "create" ? createVehicle(data) : updateVehicle(vehicle!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onClose();
    },
    onError: (err) => {
      // 409 registrationNumber conflicts render inline under that field —
      // not a generic toast/banner for this specific case.
      if (
        isAxiosError(err) &&
        err.response?.status === 409 &&
        err.response.data?.field === "registrationNumber"
      ) {
        setError("registrationNumber", {
          type: "server",
          message: err.response.data.message,
        });
      }
    },
  });

  const showGenericError =
    mutation.isError &&
    !(
      isAxiosError(mutation.error) &&
      mutation.error.response?.status === 409 &&
      mutation.error.response.data?.field === "registrationNumber"
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        noValidate
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-slate-100">
          {mode === "create" ? "Register Vehicle" : "Edit Vehicle"}
        </h2>

        {showGenericError && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            Something went wrong. Please try again.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration Number" error={errors.registrationNumber?.message}>
            <input {...register("registrationNumber")} className={inputClass} />
          </Field>

          <Field label="Name / Model" error={errors.name?.message}>
            <input {...register("name")} className={inputClass} />
          </Field>

          <Field label="Type" error={errors.type?.message}>
            <select {...register("type")} className={inputClass}>
              {VehicleTypeEnum.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Region" error={errors.region?.message}>
            <select {...register("region")} className={inputClass}>
              {RegionEnum.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Max Load Capacity (kg)" error={errors.maxLoadCapacity?.message}>
            <input type="number" step="any" {...register("maxLoadCapacity")} className={inputClass} />
          </Field>

          <Field label="Odometer (km)" error={errors.odometer?.message}>
            <input type="number" step="any" {...register("odometer")} className={inputClass} />
          </Field>

          <Field label="Acquisition Cost" error={errors.acquisitionCost?.message}>
            <input type="number" step="any" {...register("acquisitionCost")} className={inputClass} />
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
            {mode === "create" ? "Register" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
