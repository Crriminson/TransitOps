import { z } from "zod";
import { UserRoleEnum } from "./enums";

// ---------------------------------------------------------------------------
// Auth mutation schemas — Step 1 (Auth + RBAC).
// Single source of truth: imported by both client (RHF resolver) and
// server (request-body validation) so the rules never drift apart.
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: UserRoleEnum,
});
export type RegisterInput = z.infer<typeof registerSchema>;
