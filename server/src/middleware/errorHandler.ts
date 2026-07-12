import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";

// Centralized error middleware — must be registered last, after all routes.
// Shapes: 400 (Zod validation) -> { errors: { field, message }[] } per §6;
// 401/403/404/409 (AppError) -> { message }, or { field, message } when the
// error is a field-level conflict (e.g. a unique-constraint 409); anything
// else -> 500.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      errors: err.issues.map((issue) => ({
        field: issue.path.join(".") || "root",
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.field) {
      res.status(err.status).json({ field: err.field, message: err.message });
    } else {
      res.status(err.status).json({ message: err.message });
    }
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
}
