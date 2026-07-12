import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Check } from "lucide-react";

export default function SettingsPage() {
  const role = useAuthStore((state) => state.user?.role);
  
  const [depotName, setDepotName] = useState("Gandhinagar Depot GJ4");
  const [currency, setCurrency] = useState("INR (Rs)");
  const [distanceUnit, setDistanceUnit] = useState("Kilometers");

  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 800);
  };

  const rbacMatrix = [
    { role: "Fleet Manager", fleet: "full", drivers: "full", trips: "none", fuel: "none", analytics: "full" },
    { role: "Dispatcher", fleet: "view", drivers: "none", trips: "full", fuel: "none", analytics: "none" },
    { role: "Safety Officer", fleet: "none", drivers: "full", trips: "view", fuel: "none", analytics: "none" },
    { role: "Financial Analyst", fleet: "view", drivers: "none", trips: "none", fuel: "full", analytics: "full" },
  ];

  const renderAccess = (access: string) => {
    if (access === "full") return <div className="flex justify-center"><Check className="w-4 h-4 text-[var(--text-primary)]" /></div>;
    if (access === "view") return <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">View</div>;
    return <div className="text-[var(--border-color)] font-bold">—</div>;
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings &amp; RBAC</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
        {/* Left Pane: General Settings */}
        <div>
          <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6 border-b border-black/10 dark:border-white/10 pb-2">General</h2>
          
          <div className="space-y-5 max-w-md">
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest mb-2">Depot Name</label>
              <Input 
                value={depotName} 
                onChange={(e) => setDepotName(e.target.value)} 
                className="bg-transparent border-black/20 dark:border-white/20 h-11"
              />
            </div>
            
            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest mb-2">Currency</label>
              <Input 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)} 
                className="bg-transparent border-black/20 dark:border-white/20 h-11"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest mb-2">Distance Unit</label>
              <Input 
                value={distanceUnit} 
                onChange={(e) => setDistanceUnit(e.target.value)} 
                className="bg-transparent border-black/20 dark:border-white/20 h-11"
              />
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving || role !== "FLEET_MANAGER"}
                className="w-full sm:w-auto bg-[#5C88C0] hover:bg-[#4a72a5] text-white rounded-lg px-8 py-6 font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
              {role !== "FLEET_MANAGER" && (
                <p className="text-[10px] text-[var(--text-secondary)] mt-3">Only Fleet Managers can modify global settings.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: RBAC */}
        <div>
          <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-6 border-b border-black/10 dark:border-white/10 pb-2">Role-Based Access (RBAC)</h2>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[var(--text-secondary)] text-[10px] uppercase tracking-widest font-bold">
                <tr>
                  <th className="px-2 py-3 pb-4 border-b border-black/10 dark:border-white/10">Role</th>
                  <th className="px-2 py-3 pb-4 text-center border-b border-black/10 dark:border-white/10">Fleet</th>
                  <th className="px-2 py-3 pb-4 text-center border-b border-black/10 dark:border-white/10">Drivers</th>
                  <th className="px-2 py-3 pb-4 text-center border-b border-black/10 dark:border-white/10">Trips</th>
                  <th className="px-2 py-3 pb-4 text-center border-b border-black/10 dark:border-white/10">Fuel/Exp.</th>
                  <th className="px-2 py-3 pb-4 text-center border-b border-black/10 dark:border-white/10">Analytics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {rbacMatrix.map((r, i) => (
                  <tr key={i} className="text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-2 py-4 font-medium">{r.role}</td>
                    <td className="px-2 py-4 text-center">{renderAccess(r.fleet)}</td>
                    <td className="px-2 py-4 text-center">{renderAccess(r.drivers)}</td>
                    <td className="px-2 py-4 text-center">{renderAccess(r.trips)}</td>
                    <td className="px-2 py-4 text-center">{renderAccess(r.fuel)}</td>
                    <td className="px-2 py-4 text-center">{renderAccess(r.analytics)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
