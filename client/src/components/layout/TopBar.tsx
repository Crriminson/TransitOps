import { useAuthStore } from "../../store/authStore";

/**
 * TopBar — shows the /ops connection badge, the current user's name/role,
 * and a logout action (which clears the in-memory auth store and, via
 * ProtectedRoute, bounces to /login).
 */
export default function TopBar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="h-14 flex-shrink-0 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm flex items-center px-6 gap-4">
      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {/* Connection status badge */}
        <div
          id="socket-status"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/50 text-xs"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-slate-400">/ops</span>
        </div>

        {user && (
          <div className="flex items-center gap-2 text-right">
            <div className="hidden sm:block leading-tight">
              <div className="text-sm text-slate-200">{user.name}</div>
              <div className="text-xs text-slate-500">{user.role}</div>
            </div>
            <div
              id="user-avatar"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white"
              title={`${user.name} (${user.role})`}
            >
              {initials}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
