import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFuelLogs, fetchExpenses } from "../lib/costs";
import { useAuthStore } from "../store/authStore";
import FuelLogFormModal from "../components/costs/FuelLogFormModal";
import ExpenseFormModal from "../components/costs/ExpenseFormModal";

export default function FuelExpensesPage() {
  const role = useAuthStore((state) => state.user?.role);
  const isFleetManager = role === "FLEET_MANAGER" || role === "FINANCIAL_ANALYST";

  const fuelQuery = useQuery({ queryKey: ["fuel-logs"], queryFn: fetchFuelLogs });
  const expenseQuery = useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses });

  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const totalFuelCost = useMemo(() => {
    if (!fuelQuery.data) return 0;
    return fuelQuery.data.reduce((sum, log) => sum + log.cost, 0);
  }, [fuelQuery.data]);

  const totalExpenseCost = useMemo(() => {
    if (!expenseQuery.data) return 0;
    return expenseQuery.data.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenseQuery.data]);

  const totalOperationalCost = totalFuelCost + totalExpenseCost;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Fuel &amp; Expense Management</h1>

      {/* Fuel logs */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Fuel Logs</h2>
          {isFleetManager && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowFuelForm(true)}
                className="px-5 py-2 rounded-lg bg-[var(--brand-color)] hover:bg-[var(--brand-hover)] text-white text-sm font-bold transition-all shadow-md shadow-orange-500/20"
              >
                + Log Fuel
              </button>
              <button
                onClick={() => setShowExpenseForm(true)}
                className="px-5 py-2 rounded-lg bg-[var(--brand-color)] hover:bg-[var(--brand-hover)] text-white text-sm font-bold transition-all shadow-md shadow-orange-500/20"
              >
                + Add Expense
              </button>
            </div>
          )}
        </div>

        {fuelQuery.isLoading && <p className="text-[var(--text-secondary)] text-sm">Loading…</p>}
        {fuelQuery.isError && <p className="text-red-400 text-sm">Failed to load fuel logs.</p>}
        
        {fuelQuery.data && (
          <div className="w-full">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-black/10 dark:border-white/10 text-[var(--text-secondary)] text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 pb-4">Vehicle</th>
                  <th className="px-4 py-3 pb-4">Date</th>
                  <th className="px-4 py-3 pb-4">Liters</th>
                  <th className="px-4 py-3 pb-4 text-right">Fuel Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {fuelQuery.data.map((log) => (
                  <tr key={log.id} className="text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 font-mono font-bold text-xs">{log.vehicle.registrationNumber}</td>
                    <td className="px-4 py-4 font-medium">{new Date(log.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-4 font-medium">{log.liters.toLocaleString()} L</td>
                    <td className="px-4 py-4 text-right font-medium">{log.cost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Expenses */}
      <section className="space-y-4 pt-4">
        <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Other Expenses (Toll / Misc)</h2>

        {expenseQuery.isLoading && <p className="text-[var(--text-secondary)] text-sm">Loading…</p>}
        {expenseQuery.isError && <p className="text-red-400 text-sm">Failed to load expenses.</p>}
        
        {expenseQuery.data && (
          <div className="w-full">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-black/10 dark:border-white/10 text-[var(--text-secondary)] text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3 pb-4">Vehicle</th>
                  <th className="px-4 py-3 pb-4">Date</th>
                  <th className="px-4 py-3 pb-4">Type</th>
                  <th className="px-4 py-3 pb-4">Description</th>
                  <th className="px-4 py-3 pb-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {expenseQuery.data.map((expense) => (
                  <tr key={expense.id} className="text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 font-mono font-bold text-xs">{expense.vehicle.registrationNumber}</td>
                    <td className="px-4 py-4 font-medium">{new Date(expense.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-4 font-medium">{expense.type}</td>
                    <td className="px-4 py-4 text-[var(--text-secondary)] font-medium max-w-[200px] truncate">{expense.description || "—"}</td>
                    <td className="px-4 py-4 text-right">
                      {/* Using the styled pill format for amount similar to mockup */}
                      <span className="inline-block px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 font-bold rounded border border-green-500/30">
                        {expense.amount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Totals Footer */}
      <div className="border-t-2 border-[var(--text-primary)] pt-4 mt-8 flex justify-between items-center text-[var(--text-primary)] font-mono text-sm uppercase tracking-wider font-bold">
        <div>Total Operational Cost (Auto) = Fuel + Maint + Misc</div>
        <div className="text-xl text-[var(--brand-color)]">{totalOperationalCost.toLocaleString()}</div>
      </div>

      {showFuelForm && <FuelLogFormModal onClose={() => setShowFuelForm(false)} />}
      {showExpenseForm && <ExpenseFormModal onClose={() => setShowExpenseForm(false)} />}
    </div>
  );
}
