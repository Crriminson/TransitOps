import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VehicleTypeEnum, VehicleStatusEnum } from "@transitops/shared";
import { fetchVehicles, retireVehicle } from "../lib/vehicles";
import { useAuthStore } from "../store/authStore";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import VehicleFormModal from "../components/vehicles/VehicleFormModal";
import { VEHICLE_STATUS_STYLES } from "../lib/statusColors";
import Pagination from "../components/Pagination";
import type { Vehicle } from "../types/vehicle";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, MapPin, Truck, Settings } from "lucide-react";

type FormState = { mode: "create" } | { mode: "edit"; vehicle: Vehicle } | null;
const PAGE_SIZE = 10;

export default function VehiclesPage() {
  const role = useAuthStore((state) => state.user?.role);
  const isFleetManager = role === "FLEET_MANAGER";
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchReg, setSearchReg] = useState("");
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState<FormState>(null);
  const [retireTarget, setRetireTarget] = useState<Vehicle | null>(null);

  const {
    data: vehicles,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["vehicles"], queryFn: () => fetchVehicles() });

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter((v: Vehicle) => {
      const matchType = typeFilter === "all" || v.type === typeFilter;
      const matchStatus = statusFilter === "all" || v.status === statusFilter;
      const matchReg = v.registrationNumber.toLowerCase().includes(searchReg.toLowerCase()) || 
                       v.name.toLowerCase().includes(searchReg.toLowerCase());
      return matchType && matchStatus && matchReg;
    });
  }, [vehicles, typeFilter, statusFilter, searchReg]);

  const paginatedVehicles = filteredVehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const retireMutation = useMutation({
    mutationFn: (id: string) => retireVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setRetireTarget(null);
    },
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Fleet Registry</h1>
          <p className="text-[var(--text-secondary)] mt-1 font-medium">Manage and track your active vehicles.</p>
        </div>
        
        {isFleetManager && (
          <Button
            onClick={() => setFormState({ mode: "create" })}
            className="bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--bg-primary)] rounded-full px-6 font-semibold h-11"
          >
            + Add Vehicle
          </Button>
        )}
      </div>

      {/* Modern Pill-Shaped Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-sm border border-black/5 dark:border-white/10 w-full lg:w-max">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <Input 
            placeholder="Search vehicles..." 
            value={searchReg}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchReg(e.target.value); setPage(1); }}
            className="pl-11 border-none shadow-none focus-visible:ring-0 bg-transparent h-10 w-full"
          />
        </div>

        <div className="hidden md:block w-px h-6 bg-black/10 dark:bg-white/10" />

        <div className="flex items-center w-full md:w-auto gap-2 px-2">
          <Select value={typeFilter} onValueChange={(v: string) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[140px] border-none shadow-none focus:ring-0 focus-visible:ring-0 bg-transparent font-medium">
              <SelectValue placeholder="Type: All" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Any Type</SelectItem>
              {VehicleTypeEnum.options.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden md:block w-px h-6 bg-black/10 dark:bg-white/10" />

        <div className="flex items-center w-full md:w-auto gap-2 px-2">
          <Select value={statusFilter} onValueChange={(v: string) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full md:w-[140px] border-none shadow-none focus:ring-0 focus-visible:ring-0 bg-transparent font-medium">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Any Status</SelectItem>
              {VehicleStatusEnum.options.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <p className="text-[var(--text-secondary)]">Loading vehicles…</p>}
      {isError && <p className="text-red-400">Failed to load vehicles.</p>}

      {vehicles && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedVehicles.map((vehicle) => (
              <Card 
                key={vehicle.id} 
                className="overflow-hidden bg-white dark:bg-[#1a1a1a] rounded-2xl border-transparent shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)] hover:shadow-lg transition-all duration-300 group flex flex-col"
              >
                {/* Image / Header Placeholder Area */}
                <div className="h-32 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center p-6">
                  {/* Pseudo-vehicle image/icon */}
                  <Truck className="w-16 h-16 text-slate-300 dark:text-slate-600 transition-transform duration-300 group-hover:scale-110" />
                  
                  <div className="absolute top-4 right-4">
                    <StatusBadge status={vehicle.status} className={`${VEHICLE_STATUS_STYLES[vehicle.status]} shadow-sm backdrop-blur-md`} />
                  </div>
                  
                  {/* Quick stats pill overlay */}
                  <div className="absolute bottom-3 left-4 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider text-[var(--text-primary)] shadow-sm flex items-center gap-1.5">
                    <Settings className="w-3 h-3 text-[var(--brand-color)]" />
                    {vehicle.odometer.toLocaleString()} KM
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="mb-4">
                    <div className="text-[10px] uppercase font-bold text-[var(--brand-color)] tracking-wider mb-1">
                      {vehicle.type}
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                      {vehicle.name}
                    </h3>
                    <p className="text-sm font-mono text-[var(--text-secondary)] mt-1">
                      {vehicle.registrationNumber}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-auto text-sm">
                    <div>
                      <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold mb-0.5">Region</div>
                      <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        {vehicle.region}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold mb-0.5">Capacity</div>
                      <div className="font-medium text-[var(--text-primary)]">{vehicle.maxLoadCapacity.toLocaleString()} kg</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold mb-0.5">Last Service</div>
                      <div className="font-medium text-[var(--text-primary)]">{vehicle.lastServiceOdometer.toLocaleString()} km</div>
                    </div>
                  </div>

                  {isFleetManager && (
                    <div className="flex gap-2 pt-5 mt-5 border-t border-black/5 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFormState({ mode: "edit", vehicle })}
                        className="flex-1 h-8 rounded-full text-[11px] font-bold"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRetireTarget(vehicle)}
                        disabled={vehicle.status === "RETIRED"}
                        className="flex-1 h-8 rounded-full text-[11px] font-bold text-red-500 hover:text-white hover:bg-red-500 border-red-500/20 disabled:opacity-30"
                      >
                        Retire
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          
          {filteredVehicles.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
              <Truck className="w-12 h-12 text-[var(--text-secondary)]/30 mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">No vehicles found</h3>
              <p className="text-[var(--text-secondary)] mt-1">Try adjusting your filters or search term.</p>
            </div>
          )}
          
          {filteredVehicles.length > 0 && (
            <div className="flex justify-center pt-8">
              <Pagination
                currentPage={page}
                totalItems={filteredVehicles.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {formState && (
        <VehicleFormModal
          mode={formState.mode}
          vehicle={formState.mode === "edit" ? formState.vehicle : undefined}
          onClose={() => setFormState(null)}
        />
      )}

      <ConfirmDialog
        open={retireTarget !== null}
        title="Retire this vehicle?"
        description={`This action is permanent. "${retireTarget?.name}" (${retireTarget?.registrationNumber}) will be marked RETIRED and can no longer be dispatched.`}
        confirmLabel="Retire"
        onConfirm={() => retireTarget && retireMutation.mutate(retireTarget.id)}
        onCancel={() => setRetireTarget(null)}
      />
    </div>
  );
}
