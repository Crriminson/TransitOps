import { Link, useLocation } from "react-router-dom";

/**
 * Sidebar — nav items are added as feature branches land.
 * Each item maps to its Step in the Implementation Plan; `implemented`
 * flips to true once that step's route actually exists.
 */
const NAV_SECTIONS = [
  {
    label: "Operations",
    items: [
      { icon: "📊", label: "Dashboard", href: "/dashboard", step: 7, implemented: true },
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
      { icon: "🔧", label: "Maintenance", href: "/maintenance", step: 5, implemented: true },
      { icon: "⛽", label: "Fuel & Expenses", href: "/fuel-expenses", step: 6, implemented: true },
    ],
  },
  {
    label: "Analytics",
    items: [
      { icon: "📈", label: "Reports", href: "/reports", step: 8, implemented: true },
      { icon: "⚙️", label: "Settings", href: "/settings", step: 10, implemented: true },
    ],
  },
] as const;

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 flex-shrink-0 bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col">
      {/* Brand header */}
      <div className="px-5 py-5 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius)] bg-gradient-to-br from-[var(--brand-color)] to-[var(--brand-hover)] flex items-center justify-center flex-shrink-0 shadow-sm">
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
            <div className="text-sm font-extrabold text-[var(--text-primary)] leading-none tracking-tight">TransitOps</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">Transport Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-2 mb-1.5 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname.startsWith(item.href) || (location.pathname === "/" && item.href === "/dashboard");
                
                return (
                  <li key={item.href}>
                    <Link
                      to={item.implemented ? item.href : "#"}
                      id={`nav-${item.href.replace("/", "").replace("-", "_")}`}
                      onClick={(e) => {
                        if (!item.implemented) e.preventDefault();
                      }}
                      aria-disabled={!item.implemented}
                      className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius)] text-sm font-medium transition-all duration-150 group ${
                        !item.implemented
                          ? "text-[var(--border-color)] cursor-default"
                          : isActive
                          ? "bg-[var(--brand-color)]/10 text-[var(--brand-color)] font-bold shadow-sm"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                      }`}
                      title={item.implemented ? item.label : `Step ${item.step} — coming soon`}
                    >
                      <span className="text-lg leading-none">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      <span className={`text-[10px] font-mono transition-colors ${isActive ? "text-[var(--brand-color)]" : "text-[var(--border-color)] group-hover:text-[var(--text-secondary)]"}`}>
                        §{item.step}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

    </aside>
  );
}
