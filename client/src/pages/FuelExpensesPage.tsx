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
  const [activeTab, setActiveTab] = useState<"FUEL" | "EXPENSE">("FUEL");

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

      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("FUEL")}
            className={`pb-2 -mb-[18px] text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === "FUEL"
                ? "border-[var(--brand-color)] text-[var(--brand-color)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Fuel Logs
          </button>
          <button
            onClick={() => setActiveTab("EXPENSE")}
            className={`pb-2 -mb-[18px] text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === "EXPENSE"
                ? "border-[var(--brand-color)] text-[var(--brand-color)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Other Expenses
          </button>
        </div>

        {isFleetManager && (
          <div className="flex gap-3">
            <button
              onClick={() => activeTab === "FUEL" ? setShowFuelForm(true) : setShowExpenseForm(true)}
              className="px-5 py-2 rounded-lg bg-[var(--brand-color)] hover:bg-[var(--brand-hover)] text-white text-sm font-bold transition-all shadow-md shadow-orange-500/20"
            >
              + {activeTab === "FUEL" ? "Log Fuel" : "Add Expense"}
            </button>
          </div>
        )}
      </div>

      {activeTab === "FUEL" && (
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

        {fuelQuery.isLoading && <p className="text-[var(--text-secondary)] text-sm">Loading…</p>}
        {fuelQuery.isError && <p className="text-red-400 text-sm">Failed to load fuel logs.</p>}
        
        {fuelQuery.data && (
          <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm bg-[var(--bg-primary)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--bg-secondary)]/60 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-5 font-bold">Vehicle</th>
                  <th className="px-6 py-5 font-bold">Date</th>
                  <th className="px-6 py-5 font-bold">Liters</th>
                  <th className="px-6 py-5 font-bold text-right">Fuel Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {fuelQuery.data.map((log) => (
                  <tr key={log.id} className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[var(--brand-color)]">{log.vehicle.registrationNumber}</td>
                    <td className="px-6 py-4 font-bold">{new Date(log.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4 font-medium">{log.liters.toLocaleString()} L</td>
                    <td className="px-6 py-4 text-right font-bold">${log.cost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {activeTab === "EXPENSE" && (
      <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">

        {expenseQuery.isLoading && <p className="text-[var(--text-secondary)] text-sm">Loading…</p>}
        {expenseQuery.isError && <p className="text-red-400 text-sm">Failed to load expenses.</p>}
        
        {expenseQuery.data && (
          <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm bg-[var(--bg-primary)]">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--bg-secondary)]/60 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-5 font-bold">Vehicle</th>
                  <th className="px-6 py-5 font-bold">Date</th>
                  <th className="px-6 py-5 font-bold">Type</th>
                  <th className="px-6 py-5 font-bold">Description</th>
                  <th className="px-6 py-5 font-bold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {expenseQuery.data.map((expense) => (
                  <tr key={expense.id} className="text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[var(--brand-color)]">{expense.vehicle.registrationNumber}</td>
                    <td className="px-6 py-4 font-bold">{new Date(expense.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4 font-bold">{expense.type}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)] font-medium max-w-[200px] truncate">{expense.description || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-block px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 font-bold rounded-lg border border-green-500/20 shadow-sm">
                        ${expense.amount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

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
