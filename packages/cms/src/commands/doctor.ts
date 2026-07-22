/* eslint-disable no-console */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface DoctorOptions {
  dir?: string | undefined;
}

export function printDoctorHelp(): void {
  console.log(`
Usage: cms doctor [options]

Check the CMS project for common issues.

Options:
  --dir <path>   Project root directory (default: .)
  --help         Show this help
`);
  process.exit(0);
}

function check(label: string, ok: boolean, detail?: string): void {
  const icon = ok ? "✓" : "✗";
  console.log(`  ${icon} ${label}${detail ? /* v8 ignore next */ ` — ${detail}` : ""}`);
}

export async function doctor(options: DoctorOptions): Promise<void> {
  const rootDir = resolve(options.dir ?? /* v8 ignore next */ ".");
  let errors = 0;

  console.log(`[cms] Running project health check in ${rootDir}...\n`);

  // Check package.json
  const pkgPath = resolve(rootDir, "package.json");
  const hasPackageJson = existsSync(pkgPath);
  check("package.json exists", hasPackageJson);
  if (!hasPackageJson) errors++;

  // Check schema directories
  const collectionsDir = resolve(rootDir, "cms/collections");
  const globalsDir = resolve(rootDir, "cms/globals");
  check("cms/collections/ exists", existsSync(collectionsDir));
  check("cms/globals/ exists", existsSync(globalsDir));

  // Check config
  check(
    "cms/config.json or cms.config.ts",
    existsSync(resolve(rootDir, "cms/config.json")) ||
      existsSync(resolve(rootDir, "cms.config.ts")),
  );

  // Check data directory
  const dataDir = resolve(rootDir, "data");
  check("data/ directory exists", existsSync(dataDir));

  // Check TypeScript config
  check("tsconfig.json exists", existsSync(resolve(rootDir, "tsconfig.json")));

  // Check .env
  check(".env file exists", existsSync(resolve(rootDir, ".env")));

  if (errors > 0) {
    console.log(
      `\n[cms] Found ${errors} critical issue(s). Run \`cms collection create --help\` to get started.`,
    );
    process.exit(1);
  }

  console.log("\n[cms] Project looks healthy!");
}
