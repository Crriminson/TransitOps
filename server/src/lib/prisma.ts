/**
 * Prisma client singleton.
 *
 * Import this instead of `new PrismaClient()` everywhere in /server/src
 * to avoid exhausting connection pool during hot-reloads in dev.
 *
 * `@prisma/client` resolves from server's own node_modules — no path
 * hacking required. The generator in server/prisma/schema.prisma outputs
 * to the default location (server/node_modules/.prisma/client).
 */

import { PrismaClient } from "@prisma/client";

declare global {
  // Prevent multiple instances during tsx --watch hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
