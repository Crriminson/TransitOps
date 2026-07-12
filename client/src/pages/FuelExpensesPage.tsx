import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFuelLogs, fetchExpenses } from "../lib/costs";
import { useAuthStore } from "../store/authStore";
import FuelLogFormModal from "../components/costs/FuelLogFormModal";
import ExpenseFormModal from "../components/costs/ExpenseFormModal";

export default function FuelExpensesPage() {
  const role = useAuthStore((state) => state.user?.role);
  const isFleetManager = role === "FLEET_MANAGER";

  const fuelQuery = useQuery({ queryKey: ["fuel-logs"], queryFn: fetchFuelLogs });
  const expenseQuery = useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses });

  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-slate-100">Fuel &amp; Expenses</h1>

      {/* Fuel logs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-slate-200">Fuel Logs</h2>
          {isFleetManager && (
            <button
              onClick={() => setShowFuelForm(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Log Fuel
            </button>
          )}
        </div>

        {fuelQuery.isLoading && <p className="text-slate-400 text-sm">Loading…</p>}
        {fuelQuery.isError && <p className="text-red-400 text-sm">Failed to load fuel logs.</p>}
        {fuelQuery.data && (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Liters</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Trip-linked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {fuelQuery.data.map((log) => (
                  <tr key={log.id} className="text-slate-200">
                    <td className="px-4 py-3 font-mono text-xs">{log.vehicle.registrationNumber}</td>
                    <td className="px-4 py-3">{log.liters.toLocaleString()}</td>
                    <td className="px-4 py-3">{log.cost.toLocaleString()}</td>
                    <td className="px-4 py-3">{new Date(log.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-400">{log.tripId ? "Yes" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Expenses */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-slate-200">Expenses</h2>
          {isFleetManager && (
            <button
              onClick={() => setShowExpenseForm(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Log Expense
            </button>
          )}
        </div>

        {expenseQuery.isLoading && <p className="text-slate-400 text-sm">Loading…</p>}
        {expenseQuery.isError && <p className="text-red-400 text-sm">Failed to load expenses.</p>}
        {expenseQuery.data && (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {expenseQuery.data.map((expense) => (
                  <tr key={expense.id} className="text-slate-200">
                    <td className="px-4 py-3 font-mono text-xs">{expense.vehicle.registrationNumber}</td>
                    <td className="px-4 py-3">{expense.type}</td>
                    <td className="px-4 py-3">{expense.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-400">{expense.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showFuelForm && <FuelLogFormModal onClose={() => setShowFuelForm(false)} />}
      {showExpenseForm && <ExpenseFormModal onClose={() => setShowExpenseForm(false)} />}
    </div>
  );
}
