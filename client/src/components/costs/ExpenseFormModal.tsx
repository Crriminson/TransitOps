import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expenseCreateSchema, ExpenseTypeEnum, type ExpenseCreateInput } from "@transitops/shared";
import { createExpense } from "../../lib/costs";
import { fetchVehicles } from "../../lib/vehicles";

interface ExpenseFormModalProps {
  onClose: () => void;
}

const inputClass =
  "w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-slate-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const today = new Date().toISOString().slice(0, 10);

export default function ExpenseFormModal({ onClose }: ExpenseFormModalProps) {
  const queryClient = useQueryClient();
  const { data: vehicles } = useQuery({ queryKey: ["vehicles"], queryFn: () => fetchVehicles() });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseCreateInput>({
    resolver: zodResolver(expenseCreateSchema),
    defaultValues: { date: new Date(today), type: "TOLL" },
  });

  const mutation = useMutation({
    mutationFn: (data: ExpenseCreateInput) => createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
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
        <h2 className="text-lg font-semibold text-slate-100">Log Expense</h2>

        {mutation.isError && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            Something went wrong. Please try again.
          </div>
        )}

        <Field label="Vehicle" error={errors.vehicleId?.message}>
          <select {...register("vehicleId")} className={inputClass}>
            <option value="">Select a vehicle</option>
            {vehicles?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registrationNumber} — {v.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" error={errors.type?.message}>
            <select {...register("type")} className={inputClass}>
              {ExpenseTypeEnum.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount" error={errors.amount?.message}>
            <input type="number" step="any" {...register("amount")} className={inputClass} />
          </Field>
        </div>

        <Field label="Date" error={errors.date?.message}>
          <input type="date" {...register("date")} className={inputClass} />
        </Field>

        <Field label="Description (optional)" error={errors.description?.message}>
          <input {...register("description")} className={inputClass} />
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
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
