import { defineConfig } from "prisma/config";
import path from "path";

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
