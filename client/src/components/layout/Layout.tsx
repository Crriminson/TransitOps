import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6">
          {children ?? <PlaceholderContent />}
        </main>
      </div>
    </div>
  );
}

/** Placeholder shown in Phase 0 before any feature pages exist */
function PlaceholderContent() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      {/* Logo mark */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
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
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
          TransitOps
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Smart Transport Operations Platform
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 max-w-md backdrop-blur-sm">
        <p className="text-slate-300 text-sm leading-relaxed">
          <span className="font-semibold text-blue-400">Phase 0</span> scaffold
          is running. Feature pages will appear here as each step lands:
          Auth → Vehicle Registry → Driver Management → Trip Management →
          Maintenance → Fuel & Expenses → Dashboard → Reports.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>Server connection active</span>
      </div>
    </div>
  );
}
