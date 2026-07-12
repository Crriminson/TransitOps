import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";

import { Input } from "../ui/input";
import { Search } from "lucide-react";

/**
 * TopBar — shows a search placeholder, the /ops connection badge,
 * the current user's name/role, dark mode toggle, and a logout action.
 */
export default function TopBar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="h-14 flex-shrink-0 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm flex items-center px-6 gap-4">
      <div className="flex-1 flex items-center max-w-sm relative">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search..." 
          className="pl-9 bg-background/50 border-muted rounded-[var(--radius)] h-9 focus-visible:ring-[var(--brand-color)]"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--brand-color)] transition-colors shadow-sm border border-[var(--border-color)]"
          title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
        >
          {isDark ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Connection status badge */}
        <div
          id="socket-status"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs shadow-sm"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[var(--text-secondary)] font-medium">/ops</span>
        </div>

        {user && (
          <div className="flex items-center gap-2 text-right border-l border-[var(--border-color)] pl-3 ml-1">
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{user.name}</div>
              <div className="text-xs font-medium text-[var(--text-secondary)]">{user.role}</div>
            </div>
            <div
              id="user-avatar"
              className="w-8 h-8 rounded-full bg-[var(--brand-color)] flex items-center justify-center text-xs font-bold text-white shadow-sm"
              title={`${user.name} (${user.role})`}
            >
              {initials}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="ml-1 px-3 py-1.5 rounded-[var(--radius)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--brand-color)] hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
