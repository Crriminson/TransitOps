import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMaintenanceLogs, closeMaintenance } from "../lib/maintenance";
import { useAuthStore } from "../store/authStore";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import MaintenanceFormModal from "../components/maintenance/MaintenanceFormModal";
import { MAINTENANCE_STATUS_STYLES } from "../lib/statusColors";
import type { MaintenanceLog } from "../types/maintenance";

export default function MaintenancePage() {
  const role = useAuthStore((state) => state.user?.role);
  const isFleetManager = role === "FLEET_MANAGER";
  const queryClient = useQueryClient();

  const {
    data: logs,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["maintenance"], queryFn: fetchMaintenanceLogs });

  const [showForm, setShowForm] = useState(false);
  const [closeTarget, setCloseTarget] = useState<MaintenanceLog | null>(null);

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setCloseTarget(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Maintenance</h1>
        {isFleetManager && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Open Maintenance
          </button>
        )}
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Loading maintenance records…</p>}
      {isError && <p className="text-red-400 text-sm">Failed to load maintenance records.</p>}

      {logs && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3">Closed</th>
                <th className="px-4 py-3">Status</th>
                {isFleetManager && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="text-slate-200">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{log.vehicle.registrationNumber}</span>
                    <span className="text-slate-500"> — {log.vehicle.name}</span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">{log.description}</td>
                  <td className="px-4 py-3">{log.cost.toLocaleString()}</td>
                  <td className="px-4 py-3">{new Date(log.openedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {log.closedAt ? new Date(log.closedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={log.status}
                      className={MAINTENANCE_STATUS_STYLES[log.status]}
                    />
                  </td>
                  {isFleetManager && (
                    <td className="px-4 py-3">
                      {log.status === "OPEN" && (
                        <button
                          onClick={() => setCloseTarget(log)}
                          className="text-green-400 hover:text-green-300 text-xs font-medium"
                        >
                          Close
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <MaintenanceFormModal onClose={() => setShowForm(false)} />}

      <ConfirmDialog
        open={closeTarget !== null}
        title="Close this maintenance record?"
        description={`"${closeTarget?.vehicle.registrationNumber}" will return to AVAILABLE and its last-service odometer will be updated.`}
        confirmLabel="Close Record"
        onConfirm={() => closeTarget && closeMutation.mutate(closeTarget.id)}
        onCancel={() => setCloseTarget(null)}
      />
    </div>
  );
}
