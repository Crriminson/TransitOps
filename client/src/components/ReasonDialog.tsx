import { useState } from "react";

interface ReasonDialogProps {
  open: boolean;
  title: string;
  description: string;
  label: string;
  confirmLabel?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

// Like ConfirmDialog, but collects a required free-text reason first (e.g.
// Trip halt — Process Flow §4.7 requires a non-empty haltReason).
export default function ReasonDialog({
  open,
  title,
  description,
  label,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const trimmed = reason.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <p className="text-sm text-slate-400">{description}</p>

        <div className="space-y-1.5">
          <label className="text-sm text-slate-300">{label}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => {
              setReason("");
              onCancel();
            }}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!trimmed) return;
              onConfirm(trimmed);
              setReason("");
            }}
            disabled={!trimmed}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
