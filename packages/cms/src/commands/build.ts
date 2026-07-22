/* eslint-disable no-console */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface BuildOptions {
  clean?: boolean | undefined;
  outDir?: string | undefined;
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

function generateDockerfile(outDir: string): void {
  const dockerfile = `FROM node:24-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \\
    adduser --system --uid 1001 cms

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile

COPY . .

EXPOSE 3500

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3500

USER cms

CMD ["node", "dist/index.js", "start"]
`;

  const dockerignore = `node_modules
.git
.gitignore
*.md
test/
tests/
coverage/
.env
.env.*
`;

  writeFileSync(join(outDir, "Dockerfile"), dockerfile);
  writeFileSync(join(outDir, ".dockerignore"), dockerignore);
}

function generatePackageJson(outDir: string): void {
  const pkg = {
    dependencies: {
      "@fastify/cors": "^11.0.1",
      "@fastify/rate-limit": "^10.2.2",
      "@fastify/static": "^8.1.1",
      "@fastify/swagger": "^9.4.2",
      "@fastify/swagger-ui": "^5.2.2",
      "@libsql/client": "^0.17.4",
      "drizzle-orm": "^0.45.2",
      fastify: "^5.3.2",
      graphql: "^16.0.0",
      mercurius: "^16.9.0",
      pg: "^8.22.0",
      zod: "^4.4.3",
    },
    name: "arche-cms-production",
    packageManager: "pnpm@10.10.0",
    private: true,
    scripts: {
      start: "node dist/index.js start",
    },
    type: "module",
    version: "0.0.1",
  };

  writeFileSync(join(outDir, "package.json"), JSON.stringify(pkg, null, 2));
}

function cmsPackageRoot(): string {
  return resolve(fileURLToPath(import.meta.url), "../../..");
}

export async function build(options: BuildOptions): Promise<void> {
  const log = (msg: string) => console.log(`[cms] ${msg}`);

  log("Building CMS for production...");

  if (options.clean) {
    log("Cleaning build artifacts...");
    execSync("pnpm clean", { stdio: "inherit" });
  }

  // Build the admin + server (pnpm build runs build:admin + tsc)
  log("Building admin panel and server code...");
  try {
    execSync("pnpm build", {
      cwd: cmsPackageRoot(),
      env: { ...process.env, NODE_ENV: "production" },
      stdio: "inherit",
    });
  } catch {
    log("Build failed — see errors above");
    process.exit(1);
  }

  log("Build complete");

  if (!options.outDir) return;

  const outDir = resolve(options.outDir);
  log(`Assembling production bundle in ${outDir}...`);

  /* v8 ignore next -- defensive guard; directory may already exist in CI */
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const cmsDist = resolve(cmsPackageRoot(), "dist");
  const adminDist = resolve(cmsDist, "admin");

  if (existsSync(adminDist)) {
    const adminOut = resolve(outDir, "admin");
    /* v8 ignore next -- defensive guard; output dir may already exist */
    if (!existsSync(adminOut)) mkdirSync(adminOut, { recursive: true });
    execSync(`cp -r "${adminDist}/"* "${adminOut}/"`, { stdio: "inherit" });
    log(`  Copied admin panel → admin/`);
  }

  if (existsSync(cmsDist)) {
    execSync(`cp -r "${cmsDist}/"* "${outDir}/dist/"`, { stdio: "inherit" });
    log(`  Copied server code → dist/`);
  }

  generateDockerfile(outDir);
  generatePackageJson(outDir);
  log(`  Generated Dockerfile`);
  log(`  Generated package.json`);

  log(`Production bundle ready at ${outDir}`);
}
