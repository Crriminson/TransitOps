import { Link } from "react-router-dom";

/**
 * Sidebar — nav items are added as feature branches land.
 * Each item maps to its Step in the Implementation Plan; `implemented`
 * flips to true once that step's route actually exists.
 */
const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { icon: "📊", label: "Dashboard", href: "/dashboard", step: 7, implemented: false },
      { icon: "🚛", label: "Trips", href: "/trips", step: 4, implemented: true },
      { icon: "🗺️", label: "Map", href: "/map", step: 9, implemented: false },
    ],
  },
  {
    label: "Fleet",
    items: [
      { icon: "🚌", label: "Vehicles", href: "/vehicles", step: 2, implemented: true },
      { icon: "👤", label: "Drivers", href: "/drivers", step: 3, implemented: true },
      { icon: "📍", label: "Routes", href: "/routes", step: 15, implemented: false },
    ],
  },
  {
    label: "Maintenance & Costs",
    items: [
      { icon: "🔧", label: "Maintenance", href: "/maintenance", step: 5, implemented: false },
      { icon: "⛽", label: "Fuel & Expenses", href: "/fuel-expenses", step: 6, implemented: false },
    ],
  },
  {
    label: "Analytics",
    items: [
      { icon: "📈", label: "Reports", href: "/reports", step: 8, implemented: false },
    ],
  },
] as const;

export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800/60 flex flex-col">
      {/* Brand header */}
      <div className="px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 leading-none">TransitOps</div>
            <div className="text-xs text-slate-500 mt-0.5">Transport Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-2 mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.implemented ? item.href : "#"}
                    id={`nav-${item.href.replace("/", "").replace("-", "_")}`}
                    onClick={(e) => {
                      if (!item.implemented) e.preventDefault();
                    }}
                    aria-disabled={!item.implemented}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group ${
                      item.implemented
                        ? "text-slate-400 hover:text-slate-100 hover:bg-slate-800/70"
                        : "text-slate-600 cursor-default"
                    }`}
                    title={item.implemented ? item.label : `Step ${item.step} — coming soon`}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[10px] text-slate-600 group-hover:text-slate-500 font-mono">
                      §{item.step}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Phase badge */}
      <div className="px-4 py-3 border-t border-slate-800/60">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-xs text-blue-400 font-medium">Phase 0 — Infrastructure</span>
        </div>
      </div>
    </aside>
  );
}
