import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@transitops/shared";
import { verifyAuthToken } from "../lib/jwt";
import { AppError } from "../lib/errors";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}

// Role-guard decorator — run after requireAuth on any route that needs it,
// e.g. router.post("/register", requireAuth, requireRole(["FLEET_MANAGER"]), ...).
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "Authentication required"));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError(403, "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}
