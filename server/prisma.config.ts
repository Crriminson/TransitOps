import { defineConfig } from "prisma/config";
import path from "path";
import { config } from "dotenv";

// Load .env from repo root (one level up from server/)
config({ path: path.join(process.cwd(), ".env") });
// Also try server/.env as fallback
config({ path: path.join(process.cwd(), "server", ".env") });

// Replaces the deprecated `package.json#prisma` block.
// See: https://pris.ly/prisma-config
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrate: {
    async seed(prismaExecutablePath: string, args: string[]) {
      const { execFileSync } = await import("child_process");
      execFileSync("node_modules/.bin/tsx", ["prisma/seed.ts"], {
        stdio: "inherit",
      });
    },
  },
});
