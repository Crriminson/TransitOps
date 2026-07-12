import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { driverCreateSchema, RegionEnum, type DriverCreateInput } from "@transitops/shared";
import { createDriver, updateDriver } from "../../lib/drivers";
import type { Driver } from "../../types/driver";

interface DriverFormModalProps {
  mode: "create" | "edit";
  driver?: Driver;
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

// <input type="date"> needs "YYYY-MM-DD" — slice the ISO string rather than
// reformat through a Date object, avoiding local-timezone off-by-one shifts.
function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

// Shares driverCreateSchema as the form resolver in both modes — the form
// always collects a full set of fields (edit mode pre-fills every field
// from the existing driver), so create-schema validation applies equally.
export default function DriverFormModal({ mode, driver, onClose }: DriverFormModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DriverCreateInput>({
    resolver: zodResolver(driverCreateSchema),
    defaultValues: driver
      ? {
          name: driver.name,
          licenseNumber: driver.licenseNumber,
          licenseCategory: driver.licenseCategory,
          licenseExpiryDate: new Date(toDateInputValue(driver.licenseExpiryDate)),
          contactNumber: driver.contactNumber,
          safetyScore: driver.safetyScore,
          region: driver.region,
        }
      : { safetyScore: 100 },
  });

  const mutation = useMutation<Driver, unknown, DriverCreateInput>({
    mutationFn: (data) =>
      mode === "create" ? createDriver(data) : updateDriver(driver!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      onClose();
    },
    onError: (err) => {
      // 409 licenseNumber conflicts render inline under that field — not a
      // generic toast/banner for this specific case.
      if (
        isAxiosError(err) &&
        err.response?.status === 409 &&
        err.response.data?.field === "licenseNumber"
      ) {
        setError("licenseNumber", {
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
      mutation.error.response.data?.field === "licenseNumber"
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        noValidate
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-slate-100">
          {mode === "create" ? "Register Driver" : "Edit Driver"}
        </h2>

        {showGenericError && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            Something went wrong. Please try again.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" error={errors.name?.message}>
            <input {...register("name")} className={inputClass} />
          </Field>

          <Field label="License Number" error={errors.licenseNumber?.message}>
            <input {...register("licenseNumber")} className={inputClass} />
          </Field>

          <Field label="License Category" error={errors.licenseCategory?.message}>
            <input {...register("licenseCategory")} placeholder="e.g. LMV, HMV" className={inputClass} />
          </Field>

          <Field label="License Expiry Date" error={errors.licenseExpiryDate?.message}>
            <input type="date" {...register("licenseExpiryDate")} className={inputClass} />
          </Field>

          <Field label="Contact Number" error={errors.contactNumber?.message}>
            <input {...register("contactNumber")} className={inputClass} />
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

          <Field label="Safety Score (0-100)" error={errors.safetyScore?.message}>
            <input type="number" step="1" min="0" max="100" {...register("safetyScore")} className={inputClass} />
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
