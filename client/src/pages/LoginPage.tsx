import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { loginSchema, type LoginInput } from "@transitops/shared";
import { apiClient } from "../lib/apiClient";
import { useAuthStore, type AuthUser } from "../store/authStore";

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      const { data: body } = await apiClient.post<LoginResponse>(
        "/api/auth/login",
        data
      );
      login(body.user, body.token);
      navigate("/", { replace: true });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setServerError(err.response.data?.message ?? "Invalid credentials");
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Left Pane - Informational */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[var(--bg-secondary)] border-r border-[var(--border-color)] p-12 lg:p-20 relative overflow-hidden">
        
        {/* Subtle background pattern (optional) */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--text-secondary) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        <div className="relative z-10 space-y-12">
          {/* Logo Area */}
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-[var(--radius)] bg-[var(--brand-color)]/10 border border-[var(--brand-color)]/30 flex items-center justify-center">
              {/* Square grid pattern as per mockup */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <line x1="15" y1="3" x2="15" y2="21"></line>
              </svg>
            </div>
            <div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-[var(--text-primary)] tracking-tighter">TransitOps</h1>
              <p className="text-lg lg:text-xl font-medium text-[var(--text-secondary)] mt-4">Smart Transport Operations Platform</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs font-semibold tracking-widest text-[var(--text-secondary)] uppercase">
          TRANSITOPS &copy; 2026 &bull; RBAC EN4
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative bg-[var(--bg-primary)] overflow-y-auto">
        
        <div className="w-full max-w-[420px] space-y-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Sign in to your account</h2>
            <p className="text-sm font-medium text-[var(--text-secondary)]">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            
            {serverError && (
              <div className="flex items-start gap-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-[var(--radius)] p-4">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <div className="font-medium">
                  Invalid credentials.<br/>
                  <span className="opacity-80">Account locked after 5 failed attempts.</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold tracking-wide uppercase text-[var(--text-secondary)]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="raven.k@transitops.in"
                  autoComplete="email"
                  {...register("email")}
                  className="w-full rounded-[var(--radius)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)] focus:border-transparent transition-all placeholder:text-[var(--text-secondary)]/50 shadow-sm"
                />
                {errors.email && (
                  <p className="text-xs font-medium text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-bold tracking-wide uppercase text-[var(--text-secondary)]">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  className="w-full rounded-[var(--radius)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)] focus:border-transparent transition-all placeholder:text-[var(--text-secondary)]/50 shadow-sm"
                />
                {errors.password && (
                  <p className="text-xs font-medium text-red-500">{errors.password.message}</p>
                )}
              </div>
              
              {/* Fake Role Dropdown for visual mockup fidelity */}
              <div className="space-y-1.5 opacity-60">
                <label htmlFor="role" className="text-xs font-bold tracking-wide uppercase text-[var(--text-secondary)] flex items-center justify-between">
                  <span>Role (RBAC)</span>
                  <span className="text-[10px] text-amber-500/80 normal-case tracking-normal">Auto-detected</span>
                </label>
                <select
                  id="role"
                  disabled
                  className="w-full rounded-[var(--radius)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] cursor-not-allowed appearance-none shadow-sm"
                >
                  <option>Dispatcher</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--brand-color)] focus:ring-[var(--brand-color)] bg-[var(--bg-secondary)]"
                />
                <label htmlFor="remember" className="text-sm font-medium text-[var(--text-secondary)] cursor-pointer">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm font-medium text-[var(--brand-color)] hover:underline transition-all">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 text-[15px]"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
