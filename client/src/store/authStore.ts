import { create } from "zustand";
import type { UserRole } from "@transitops/shared";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

// Token and user live in memory only — no persist middleware, no
// localStorage/sessionStorage. Process Flow §1 holds the JWT in memory by
// design: a hard refresh intentionally logs the user out for this demo.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
}));
