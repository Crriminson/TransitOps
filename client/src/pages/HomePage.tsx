import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../lib/apiClient";
import { useAuthStore, type AuthUser } from "../store/authStore";

// Placeholder protected home page — proves the auth guard and login flow
// work end to end. Replaced by the real Dashboard in Step 7.
//
// Calls GET /api/auth/me on mount (through apiClient, so the Authorization
// header is attached automatically) — this is the protected route /me
// exists for: confirming the token the store holds is still valid against
// the server, not just trusting the cached login response.
export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [verifiedUser, setVerifiedUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    apiClient
      .get<AuthUser>("/api/auth/me")
      .then((res) => setVerifiedUser(res.data))
      .catch(() => logout());
  }, [logout]);

  const displayUser = verifiedUser ?? user;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-100">
        Logged in as {displayUser?.name} ({displayUser?.role})
      </h1>
      <div className="flex items-center gap-3">
        <Link
          to="/vehicles"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          View Vehicles
        </Link>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
