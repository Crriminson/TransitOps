/**
 * TopBar — Phase 0 shell.
 * Will hold user avatar/role badge, notification bell, and breadcrumbs
 * once Auth (Step 1) and Dashboard (Step 7) land.
 */
export default function TopBar() {
  return (
    <header className="h-14 flex-shrink-0 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm flex items-center px-6 gap-4">
      {/* Left: breadcrumb placeholder */}
      <div className="flex-1">
        <div className="text-sm text-slate-500">
          <span className="text-slate-300 font-medium">Dashboard</span>
        </div>
      </div>

      {/* Right: status indicators */}
      <div className="flex items-center gap-3">
        {/* Connection status badge */}
        <div
          id="socket-status"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/50 text-xs"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-slate-400">/ops</span>
        </div>

        {/* User avatar placeholder (Step 1) */}
        <div
          id="user-avatar"
          className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white cursor-pointer"
          title="Login — Step 1"
        >
          ?
        </div>
      </div>
    </header>
  );
}
