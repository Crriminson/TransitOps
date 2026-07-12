import jwt from "jsonwebtoken";
import type { UserRole } from "@transitops/shared";

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
}

// Read lazily (inside functions, not at module scope) so this module can be
// imported before index.ts's dotenv.config() call has populated
// process.env — ES module imports are evaluated before the importing
// module's own top-level statements run, so a module-scope read here could
// see JWT_SECRET as undefined even though it's set by the time any request
// actually arrives.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "2h" });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getSecret()) as AuthTokenPayload;
}
