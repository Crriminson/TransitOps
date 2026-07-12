import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { maintenanceCreateSchema, type MaintenanceCreateInput } from "@transitops/shared";
import { openMaintenance } from "../../lib/maintenance";
import { fetchAvailableVehicles } from "../../lib/vehicles";

interface MaintenanceFormModalProps {
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

// Open-only. The vehicle dropdown lists only AVAILABLE vehicles — the only
// ones eligible to enter maintenance (an ON_TRIP/IN_SHOP/RETIRED vehicle is
// rejected server-side too, so this is UX filtering over a real guard).
export default function MaintenanceFormModal({ onClose }: MaintenanceFormModalProps) {
  const queryClient = useQueryClient();

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles", "available"],
    queryFn: fetchAvailableVehicles,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceCreateInput>({
    resolver: zodResolver(maintenanceCreateSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: MaintenanceCreateInput) => openMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        noValidate
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-slate-100">Open Maintenance Record</h2>

        {mutation.isError && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            Could not open the record. The vehicle may no longer be available.
          </div>
        )}

        <Field label="Vehicle" error={errors.vehicleId?.message}>
          <select {...register("vehicleId")} className={inputClass}>
            <option value="">Select an available vehicle</option>
            {vehicles?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNumber} — {v.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description" error={errors.description?.message}>
          <textarea {...register("description")} rows={3} className={inputClass} />
        </Field>

        <Field label="Estimated Cost" error={errors.cost?.message}>
          <input type="number" step="any" {...register("cost")} className={inputClass} />
        </Field>

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
            Open Record
          </button>
        </div>
      </form>
    </div>
  );
}
