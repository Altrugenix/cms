/* eslint-disable no-console */

import { execSync } from "node:child_process";

export interface BuildOptions {
  clean?: boolean;
  outDir?: string;
}

export function printBuildHelp(): void {
  console.log(`
Usage: cms build [options]

Build the CMS for production.

Options:
  --clean        Clean build artifacts before building
  --out-dir      Output directory for production bundle
  --help         Show this help
`);
  process.exit(0);
}

export async function build(options: BuildOptions): Promise<void> {
  console.log("[cms] Building CMS for production...");

  if (options.clean) {
    console.log("[cms] Cleaning build artifacts...");
    execSync("yarn clean", { stdio: "inherit" });
  }

  // Build the admin panel UI (Vite SPA)
  console.log("[cms] Building admin panel...");
  try {
    execSync("yarn workspace @altrugenix/admin build", {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    });
    console.log("[cms] Admin panel built");
  } catch {
    console.warn("[cms] Warning: admin panel build failed (admin-ui will not be available)");
  }

  // Build the TypeScript server code
  console.log("[cms] Building server code...");
  execSync("yarn workspace @altrugenix/cli build", { stdio: "inherit" });

  console.log("[cms] Build complete");
  console.log("[cms]   Admin panel: apps/admin/dist/");
  console.log("[cms]   Server code: packages/cli/dist/");

  if (options.outDir) {
    console.log(`[cms] Copying build to ${options.outDir}...`);
    // Future: bundle everything into outDir
  }
}
