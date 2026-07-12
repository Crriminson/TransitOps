import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tripCompleteSchema, type TripCompleteInput } from "@transitops/shared";

interface CompleteTripDialogProps {
  open: boolean;
  currentOdometer: number;
  onConfirm: (input: TripCompleteInput) => void;
  onCancel: () => void;
}

const inputClass =
  "w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

// Process Flow §4.2: completion requires finalOdometer + fuelConsumed.
export default function CompleteTripDialog({
  open,
  currentOdometer,
  onConfirm,
  onCancel,
}: CompleteTripDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TripCompleteInput>({ resolver: zodResolver(tripCompleteSchema) });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <form
        onSubmit={handleSubmit((data) => {
          onConfirm(data);
          reset();
        })}
        noValidate
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-slate-100">Complete this trip?</h2>
        <p className="text-sm text-slate-400">
          Current vehicle odometer: {currentOdometer.toLocaleString()} km
        </p>

        <div className="space-y-1.5">
          <label className="text-sm text-slate-300">Final Odometer (km)</label>
          <input type="number" step="any" {...register("finalOdometer")} className={inputClass} />
          {errors.finalOdometer && (
            <p className="text-xs text-red-400">{errors.finalOdometer.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-slate-300">Fuel Consumed (liters)</label>
          <input type="number" step="any" {...register("fuelConsumed")} className={inputClass} />
          {errors.fuelConsumed && (
            <p className="text-xs text-red-400">{errors.fuelConsumed.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              reset();
              onCancel();
            }}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
          >
            Complete
          </button>
        </div>
      </form>
    </div>
  );
}
