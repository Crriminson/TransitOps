import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DriverStatusInput } from "@transitops/shared";
import { fetchDrivers, setDriverStatus } from "../lib/drivers";
import { useAuthStore } from "../store/authStore";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import DriverFormModal from "../components/drivers/DriverFormModal";
import { DRIVER_STATUS_STYLES } from "../lib/statusColors";
import type { Driver } from "../types/driver";

type FormState = { mode: "create" } | { mode: "edit"; driver: Driver } | null;

export default function DriversPage() {
  const role = useAuthStore((state) => state.user?.role);
  const canWrite = role === "FLEET_MANAGER" || role === "SAFETY_OFFICER";
  const queryClient = useQueryClient();

  const {
    data: drivers,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });

  const [formState, setFormState] = useState<FormState>(null);
  const [suspendTarget, setSuspendTarget] = useState<Driver | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DriverStatusInput["status"] }) =>
      setDriverStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setSuspendTarget(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Drivers</h1>
        {canWrite && (
          <button
            onClick={() => setFormState({ mode: "create" })}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Register Driver
          </button>
        )}
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Loading drivers…</p>}
      {isError && <p className="text-red-400 text-sm">Failed to load drivers.</p>}

      {drivers && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">License Number</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">License Expiry</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Safety Score</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Status</th>
                {canWrite && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {drivers.map((driver) => (
                <tr key={driver.id} className="text-slate-200">
                  <td className="px-4 py-3">{driver.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{driver.licenseNumber}</td>
                  <td className="px-4 py-3">{driver.licenseCategory}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{new Date(driver.licenseExpiryDate).toLocaleDateString()}</span>
                      {driver.licenseExpired && (
                        <StatusBadge
                          status="Expired"
                          className="bg-red-500/10 text-red-400 border-red-500/20"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{driver.contactNumber}</td>
                  <td className="px-4 py-3">{driver.safetyScore}</td>
                  <td className="px-4 py-3">{driver.region}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={driver.status}
                      className={DRIVER_STATUS_STYLES[driver.status]}
                    />
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setFormState({ mode: "edit", driver })}
                          className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                        >
                          Edit
                        </button>
                        {driver.status !== "ON_TRIP" && driver.status !== "SUSPENDED" && (
                          <button
                            onClick={() => setSuspendTarget(driver)}
                            className="text-red-400 hover:text-red-300 text-xs font-medium"
                          >
                            Suspend
                          </button>
                        )}
                        {driver.status === "AVAILABLE" && (
                          <button
                            onClick={() =>
                              statusMutation.mutate({ id: driver.id, status: "OFF_DUTY" })
                            }
                            className="text-slate-400 hover:text-slate-300 text-xs font-medium"
                          >
                            Set Off Duty
                          </button>
                        )}
                        {(driver.status === "OFF_DUTY" || driver.status === "SUSPENDED") && (
                          <button
                            onClick={() =>
                              statusMutation.mutate({ id: driver.id, status: "AVAILABLE" })
                            }
                            className="text-green-400 hover:text-green-300 text-xs font-medium"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formState && (
        <DriverFormModal
          mode={formState.mode}
          driver={formState.mode === "edit" ? formState.driver : undefined}
          onClose={() => setFormState(null)}
        />
      )}

      <ConfirmDialog
        open={suspendTarget !== null}
        title="Suspend this driver?"
        description={`"${suspendTarget?.name}" (${suspendTarget?.licenseNumber}) will be blocked from trip assignment until reactivated.`}
        confirmLabel="Suspend"
        onConfirm={() =>
          suspendTarget &&
          statusMutation.mutate({ id: suspendTarget.id, status: "SUSPENDED" })
        }
        onCancel={() => setSuspendTarget(null)}
      />
    </div>
  );
}
