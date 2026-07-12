import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchVehicles, retireVehicle } from "../lib/vehicles";
import { useAuthStore } from "../store/authStore";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import VehicleFormModal from "../components/vehicles/VehicleFormModal";
import { VEHICLE_STATUS_STYLES } from "../lib/statusColors";
import type { Vehicle } from "../types/vehicle";

type FormState = { mode: "create" } | { mode: "edit"; vehicle: Vehicle } | null;

export default function VehiclesPage() {
  const role = useAuthStore((state) => state.user?.role);
  const isFleetManager = role === "FLEET_MANAGER";
  const queryClient = useQueryClient();

  const {
    data: vehicles,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["vehicles"], queryFn: () => fetchVehicles() });

  const [formState, setFormState] = useState<FormState>(null);
  const [retireTarget, setRetireTarget] = useState<Vehicle | null>(null);

  const retireMutation = useMutation({
    mutationFn: (id: string) => retireVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setRetireTarget(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-100">Vehicles</h1>
        {isFleetManager && (
          <button
            onClick={() => setFormState({ mode: "create" })}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Register Vehicle
          </button>
        )}
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Loading vehicles…</p>}
      {isError && <p className="text-red-400 text-sm">Failed to load vehicles.</p>}

      {vehicles && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Max Load (kg)</th>
                <th className="px-4 py-3">Odometer (km)</th>
                <th className="px-4 py-3">Acquisition Cost</th>
                <th className="px-4 py-3">Last Service Odometer</th>
                <th className="px-4 py-3">Status</th>
                {isFleetManager && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="text-slate-200">
                  <td className="px-4 py-3 font-mono text-xs">{vehicle.registrationNumber}</td>
                  <td className="px-4 py-3">{vehicle.name}</td>
                  <td className="px-4 py-3">{vehicle.type}</td>
                  <td className="px-4 py-3">{vehicle.region}</td>
                  <td className="px-4 py-3">{vehicle.maxLoadCapacity.toLocaleString()}</td>
                  <td className="px-4 py-3">{vehicle.odometer.toLocaleString()}</td>
                  <td className="px-4 py-3">{vehicle.acquisitionCost.toLocaleString()}</td>
                  <td className="px-4 py-3">{vehicle.lastServiceOdometer.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={vehicle.status}
                      className={VEHICLE_STATUS_STYLES[vehicle.status]}
                    />
                  </td>
                  {isFleetManager && (
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setFormState({ mode: "edit", vehicle })}
                          className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setRetireTarget(vehicle)}
                          disabled={vehicle.status === "RETIRED"}
                          className="text-red-400 hover:text-red-300 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Retire
                        </button>
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
