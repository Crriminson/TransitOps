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
      <div className="w-full max-w-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--radius)] p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>

        <div className="space-y-1.5">
          <label className="text-sm text-[var(--text-secondary)]">{label}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-[var(--radius)] bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => {
              setReason("");
              onCancel();
            }}
            className="px-4 py-2 rounded-[var(--radius)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition-colors"
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
            className="px-4 py-2 rounded-[var(--radius)] bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
