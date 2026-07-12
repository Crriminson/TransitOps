import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DriverStatusInput } from "@transitops/shared";
import { fetchDrivers, setDriverStatus } from "../lib/drivers";
import { useAuthStore } from "../store/authStore";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import DriverFormModal from "../components/drivers/DriverFormModal";
import Pagination from "../components/Pagination";
import type { Driver } from "../types/driver";

import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { AlertCircle, Download } from "lucide-react";
import { exportTableToPDF } from "../lib/pdfExport";

type FormState = { mode: "create" } | { mode: "edit"; driver: Driver } | null;
const PAGE_SIZE = 10;

const TOGGLE_STATUSES = [
  { label: "Available", value: "AVAILABLE", color: "bg-green-500 text-white border-transparent" },
  { label: "On Trip", value: "ON_TRIP", color: "bg-blue-500 text-white border-transparent" },
  { label: "Off Duty", value: "OFF_DUTY", color: "bg-[var(--text-secondary)] text-white border-transparent" },
  { label: "Suspended", value: "SUSPENDED", color: "bg-[#cc6600] text-white border-transparent" },
];

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
  const [page, setPage] = useState(1);
  
  const [searchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredDrivers = useMemo(() => {
    if (!drivers) return [];
    return drivers.filter((d) => {
      const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter ? d.status === statusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [drivers, searchQuery, statusFilter]);

  const paginatedDrivers = filteredDrivers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: DriverStatusInput["status"] }) =>
      setDriverStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setSuspendTarget(null);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE": return "bg-green-500/10 text-green-500 border-green-500/30";
      case "ON_TRIP": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
      case "OFF_DUTY": return "bg-[var(--text-secondary)]/10 text-[var(--text-secondary)] border-[var(--text-secondary)]/30";
      case "SUSPENDED": return "bg-[#cc6600]/10 text-[#cc6600] border-[#cc6600]/30";
      default: return "";
    }
  };

  const getSafetyColor = (score: number) => {
    if (score >= 90) return "bg-green-500/10 text-green-500 border-green-500/30";
    if (score >= 75) return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    return "bg-[#cc6600]/10 text-[#cc6600] border-[#cc6600]/30";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 w-full max-w-xl">
          <h1 className="text-xl font-semibold text-[var(--text-primary)] min-w-max">Drivers & Safety Profiles</h1>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const data = filteredDrivers.map(d => [
                d.name,
                d.licenseNumber,
                d.licenseCategory,
                new Date(d.licenseExpiryDate).toLocaleDateString(),
                d.contactNumber,
                d.status
              ]);
              exportTableToPDF("Drivers Directory", ["Driver", "License", "Category", "Expiry", "Contact", "Status"], data, "drivers.pdf");
            }}
            className="h-10 text-xs font-bold border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] rounded-full"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>

          {canWrite && (
            <Button
              onClick={() => setFormState({ mode: "create" })}
              className="bg-[#cc6600] hover:bg-[#b35900] text-white rounded-full h-10 px-6"
            >
              + Add Driver
            </Button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-[var(--text-secondary)] text-sm">Loading drivers…</p>}
      {isError && <p className="text-red-400 text-sm">Failed to load drivers.</p>}

      {drivers && (
        <div className="space-y-6">
          
          <Card className="bg-[var(--bg-primary)] border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--bg-secondary)]/60 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-6 py-5 font-bold">Driver</th>
                    <th className="px-6 py-5 font-bold">License No</th>
                    <th className="px-6 py-5 font-bold">Category</th>
                    <th className="px-6 py-5 font-bold">Expiry</th>
                    <th className="px-6 py-5 font-bold">Contact</th>
                    <th className="px-6 py-5 font-bold">Trip Compl.</th>
                    <th className="px-6 py-5 font-bold">Safety Score</th>
                    <th className="px-6 py-5 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/60">
                  {paginatedDrivers.map((driver) => (
                    <tr key={driver.id} className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold flex items-center gap-2">
                          {driver.name}
                          {canWrite && (
                            <button
                              onClick={() => setFormState({ mode: "edit", driver })}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--brand-color)] uppercase tracking-wider font-bold transition-opacity"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-[var(--brand-color)] text-sm">{driver.licenseNumber}</td>
                      <td className="px-6 py-4 font-bold">{driver.licenseCategory}</td>
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{new Date(driver.licenseExpiryDate).toLocaleDateString()}</span>
                          {driver.licenseExpired && (
                            <StatusBadge status="EXPIRED" className="bg-[#cc6600]/10 text-[#cc6600] border-[#cc6600]/30 px-1.5 py-0.5 text-[10px] font-bold shadow-sm" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-medium">{driver.contactNumber}</td>
                      <td className="px-6 py-4 font-bold">{Math.round(Math.random() * 20 + 80)}%</td> {/* Mocked trip completion rate */}
                      <td className="px-6 py-4">
                        <StatusBadge status={`${driver.safetyScore}/100`} className={`${getSafetyColor(driver.safetyScore)} font-bold shadow-sm`} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <StatusBadge status={driver.status} className={`${getStatusColor(driver.status)} font-bold shadow-sm`} />
                          {canWrite && driver.status === "AVAILABLE" && (
                            <button
                              onClick={() => setSuspendTarget(driver)}
                              className="text-[10px] text-[#cc6600] hover:underline"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDrivers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-[var(--text-secondary)] border-dashed border-[var(--border-color)]">
                        No drivers match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Toggle Status</div>
              <div className="flex items-center gap-2">
                {TOGGLE_STATUSES.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => {
                      setStatusFilter(statusFilter === status.value ? null : status.value);
                      setPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-[var(--radius)] text-xs font-medium transition-all border ${
                      statusFilter === status.value 
                        ? status.color 
                        : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--text-secondary)]"
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
            
            {filteredDrivers.length > 0 && (
              <Pagination
                currentPage={page}
                totalItems={filteredDrivers.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            )}
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 text-[#cc6600] rounded-2xl p-4 flex items-start gap-3 shadow-sm max-w-max">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-0.5">Assignment Rule</h4>
              <p className="text-sm font-medium opacity-90">
                Drivers with an expired license or a Suspended status are automatically blocked from trip assignment.
              </p>
            </div>
          </div>
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
