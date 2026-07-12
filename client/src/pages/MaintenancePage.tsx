import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { maintenanceCreateSchema, type MaintenanceCreateInput } from "@transitops/shared";
import { fetchMaintenanceLogs, openMaintenance, closeMaintenance } from "../lib/maintenance";
import { fetchAvailableVehicles } from "../lib/vehicles";
import { useAuthStore } from "../store/authStore";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import type { MaintenanceLog } from "../types/maintenance";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function MaintenancePage() {
  const role = useAuthStore((state) => state.user?.role);
  const isFleetManager = role === "FLEET_MANAGER";
  const queryClient = useQueryClient();

  const {
    data: logs,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["maintenance"], queryFn: fetchMaintenanceLogs });

  const { data: availableVehicles } = useQuery({
    queryKey: ["vehicles", "available"],
    queryFn: fetchAvailableVehicles,
  });

  const [closeTarget, setCloseTarget] = useState<MaintenanceLog | null>(null);
  const [searchQuery] = useState("");

  const filteredLogs = React.useMemo(() => {
    if (!logs) return [];
    if (!searchQuery) return logs;
    const lowerQuery = searchQuery.toLowerCase();
    return logs.filter((l) => 
      l.vehicle.registrationNumber.toLowerCase().includes(lowerQuery) ||
      l.description.toLowerCase().includes(lowerQuery)
    );
  }, [logs, searchQuery]);

  // Actions
  const closeMutation = useMutation({
    mutationFn: (id: string) => closeMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles", "available"] });
      setCloseTarget(null);
    },
  });

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MaintenanceCreateInput>({
    resolver: zodResolver(maintenanceCreateSchema),
  });
  
  const watchVehicleId = watch("vehicleId");

  const openMutation = useMutation({
    mutationFn: (data: MaintenanceCreateInput) => openMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles", "available"] });
      reset(); // clear form
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Maintenance</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Pane: Log Service Record Form */}
        {isFleetManager && (
          <div className="space-y-6 lg:border-r border-[var(--border-color)] lg:pr-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Log Service Record</h2>

            <form
              onSubmit={handleSubmit((data) => openMutation.mutate(data))}
              noValidate
              className="space-y-4"
            >
              {openMutation.isError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-[var(--radius)] px-3 py-2">
                  Could not open the record. The vehicle may no longer be available.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Vehicle</label>
                <Select value={watchVehicleId || ""} onValueChange={(val: string) => setValue("vehicleId", val, { shouldValidate: true })}>
                  <SelectTrigger className="bg-[var(--bg-primary)]">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registrationNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vehicleId && <p className="text-xs text-red-400">{errors.vehicleId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Service Type</label>
                <Input {...register("description")} placeholder="e.g. Oil Change" className="bg-[var(--bg-primary)]" />
                {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Cost</label>
                <Input type="number" step="any" {...register("cost")} placeholder="e.g. 2500" className="bg-[var(--bg-primary)]" />
                {errors.cost && <p className="text-xs text-red-400">{errors.cost.message}</p>}
              </div>

              <div className="space-y-1.5 opacity-60">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Date</label>
                <Input value={new Date().toLocaleDateString()} disabled className="bg-[var(--bg-primary)] cursor-not-allowed" />
              </div>

              <div className="space-y-1.5 opacity-60">
                <label className="text-xs uppercase text-[var(--text-secondary)] font-semibold">Status</label>
                <Input value="Active" disabled className="bg-[var(--bg-primary)] cursor-not-allowed" />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || openMutation.isPending}
                  className="w-full bg-[#cc6600] hover:bg-[#b35900] text-white" // Custom orange button to match wireframe exactly
                >
                  Save
                </Button>
              </div>
            </form>

            <div className="pt-6 space-y-4 text-xs font-medium border-t border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="text-green-500 w-16">Available</span>
                <div className="flex-1 relative h-4 flex items-center">
                  <div className="absolute left-0 right-0 h-[1px] bg-[var(--text-secondary)]"></div>
                  <div className="absolute right-0 -mt-[4px] border-solid border-l-[8px] border-y-[4px] border-l-[var(--text-secondary)] border-y-transparent"></div>
                  <span className="absolute left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2">creating active record</span>
                </div>
                <span className="text-[#cc6600] w-12 text-right">In Shop</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#cc6600] w-16">In Shop</span>
                <div className="flex-1 relative h-4 flex items-center">
                  <div className="absolute left-0 right-0 h-[1px] bg-[var(--text-secondary)]"></div>
                  <div className="absolute right-0 -mt-[4px] border-solid border-l-[8px] border-y-[4px] border-l-[var(--text-secondary)] border-y-transparent"></div>
                  <span className="absolute left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2">closing record</span>
                </div>
                <span className="text-green-500 w-12 text-right">Available</span>
              </div>
              
              <p className="text-[#cc6600] opacity-80 pt-2">Note: In Shop vehicles are removed from the dispatch pool.</p>
            </div>
          </div>
        )}

        {/* Right Pane: Service Log */}
        <div className={isFleetManager ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Service Log</h2>

          {isLoading && <p className="text-[var(--text-secondary)] text-sm">Loading maintenance records…</p>}
          {isError && <p className="text-red-400 text-sm">Failed to load maintenance records.</p>}

          {logs && (
            <Card className="bg-[var(--bg-primary)] border-[var(--border-color)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[10px] uppercase tracking-widest border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Vehicle</th>
                      <th className="px-5 py-4 font-semibold">Service</th>
                      <th className="px-5 py-4 font-semibold">Cost</th>
                      <th className="px-5 py-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-mono font-medium">{log.vehicle.registrationNumber}</div>
                        </td>
                        <td className="px-5 py-4 max-w-[200px] truncate">{log.description}</td>
                        <td className="px-5 py-4">${log.cost.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <StatusBadge
                              status={log.status === "OPEN" ? "In Shop" : "Completed"}
                              className={log.status === "OPEN" 
                                ? "bg-[#cc6600]/10 text-[#cc6600] border-[#cc6600]/30" 
                                : "bg-green-500/10 text-green-500 border-green-500/30"}
                            />
                            {isFleetManager && log.status === "OPEN" && (
                              <button
                                onClick={() => setCloseTarget(log)}
                                className="text-xs font-semibold text-green-500 hover:text-green-400 transition-colors"
                              >
                                Close
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-[var(--text-secondary)] border-dashed border-[var(--border-color)]">
                          No service records match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

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
