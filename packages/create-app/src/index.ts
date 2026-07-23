#!/usr/bin/env node

/* eslint-disable no-console, no-secrets/no-secrets */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

export function ask(query: string, defaultVal?: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const hint = defaultVal ? ` (${defaultVal})` : "";
    rl.question(`${query}${hint}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultVal || "");
    });
  });
}

export function scaffold(
  projectDir: string,
  opts: {
    dbAdapter: string;
    defaultLocale: string;
  },
): void {
  const dirs = ["cms/collections", "cms/globals", "cms/components"];
  for (const d of dirs) {
    mkdirSync(resolve(projectDir, d), { recursive: true });
  }

  // package.json
  writeFileSync(
    resolve(projectDir, "package.json"),
    JSON.stringify(
      {
        dependencies: {
          "@arche-cms/cms": "^0.1.10",
          "@arche-cms/schema": "^0.1.10",
        },
        name: projectDir.split("/").pop() ?? /* v8 ignore next -- unreachable */ "my-cms-app",
        private: true,
        scripts: {
          build: "cms build",
          dev: "cms dev",
          start: "cms start",
        },
        type: "module",
        version: "0.1.0",
      },
      null,
      2,
    ) + "\n",
  );

  // .env
  writeFileSync(
    resolve(projectDir, ".env"),
    [
      `DB_ADAPTER=${opts.dbAdapter}`,
      opts.dbAdapter === "sqlite"
        ? 'DB_URL="file:./cms.db"'
        : 'DB_URL="postgresql://localhost:5432/mydb"',
      'STORAGE_DIR="./uploads"',
      `DEFAULT_LOCALE=${opts.defaultLocale}`,
      "",
    ].join("\n"),
  );

  // arche-cms.config.ts
  writeFileSync(
    resolve(projectDir, "arche-cms.config.ts"),
    [
      `import { defineConfig } from "@arche-cms/cms";`,
      "",
      "export default defineConfig({",
      `  database: { adapter: "${opts.dbAdapter}" },`,
      `  localization: { defaultLocale: "${opts.defaultLocale}" },`,
      "});",
      "",
    ].join("\n"),
  );

  // Example collection
  writeFileSync(
    resolve(projectDir, "cms/collections/posts.ts"),
    [
      'import { defineCollection, text, slug, richText, select } from "@arche-cms/schema";',
      "",
      "export default defineCollection({",
      '  slug: "posts",',
      '  labels: { singular: "Post", plural: "Posts" },',
      "  fields: [",
      '    text("title"),',
      '    slug("slug", { source: "title" }),',
      '    richText("content"),',
      '    select("status", { options: [{ label: "Draft", value: "draft" }, { label: "Published", value: "published" }], defaultValue: "draft" }),',
      "  ],",
      "});",
      "",
    ].join("\n"),
  );

  // Example global
  writeFileSync(
    resolve(projectDir, "cms/globals/site-settings.ts"),
    [
      'import { defineGlobal, text, textarea, media } from "@arche-cms/schema";',
      "",
      "export default defineGlobal({",
      '  slug: "site-settings",',
      '  label: "Site Settings",',
      "  fields: [",
      '    text("siteName"),',
      '    textarea("description"),',
      '    media("logo"),',
      "  ],",
      "});",
      "",
    ].join("\n"),
  );

  // .gitignore
  writeFileSync(
    resolve(projectDir, ".gitignore"),
    ["node_modules", "dist", "*.db", "uploads", ".env", ""].join("\n"),
  );

  // Dockerfile
  writeFileSync(
    resolve(projectDir, "Dockerfile"),
    [
      "FROM node:24-alpine AS builder",
      "WORKDIR /app",
      "",
      "COPY package.json pnpm-lock.yaml* ./",
      "RUN corepack enable && pnpm install",
      "",
      "COPY . .",
      "RUN pnpm build",
      "",
      "FROM node:24-alpine AS runner",
      "WORKDIR /app",
      "",
      "RUN addgroup --system --gid 1001 nodejs && \\",
      "    adduser --system --uid 1001 cms",
      "",
      "COPY package.json pnpm-lock.yaml* ./",
      "RUN corepack enable && pnpm install --prod",
      "",
      "COPY --from=builder /app/node_modules/@arche-cms ./node_modules/@arche-cms",
      "COPY --from=builder /app/node_modules/.bin ./node_modules/.bin",
      "COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm",
      "COPY cms ./cms",
      "",
      "EXPOSE 3000",
      "",
      "ENV NODE_ENV=production",
      "ENV HOST=0.0.0.0",
      "ENV PORT=3000",
      "",
      "USER cms",
      "",
      'CMD ["npx", "cms", "start"]',
      "",
    ].join("\n"),
  );

  // .dockerignore
  writeFileSync(
    resolve(projectDir, ".dockerignore"),
    ["node_modules", "dist", "*.db", "uploads", ".env", ".git", ""].join("\n"),
  );

  // docker-compose.yml
  const composeServices: string[] = [
    "  app:",
    "    build: .",
    "    ports:",
    '      - "3000:3000"',
    "    env_file:",
    '      - .env',
    "    volumes:",
    '      - uploads:/app/uploads',
  ];
  const composeVolumes: string[] = ["  uploads:"];

  if (opts.dbAdapter === "postgres") {
    composeServices.push(
      "",
      "  db:",
      "    image: postgres:16-alpine",
      "    environment:",
      "      POSTGRES_USER: cms",
      "      POSTGRES_PASSWORD: cms",
      "      POSTGRES_DB: cms",
      "    ports:",
      '      - "5432:5432"',
      "    volumes:",
      "      - pgdata:/var/lib/postgresql/data",
    );
    composeVolumes.push("  pgdata:");
  }

  writeFileSync(
    resolve(projectDir, "docker-compose.yml"),
    [
      "services:",
      ...composeServices,
      "",
      "volumes:",
      ...composeVolumes,
      "",
    ].join("\n"),
  );

  console.log(`\nScaffolded CMS project at ${projectDir}`);
  console.log("\nNext steps:");
  console.log(`  cd ${projectDir.split("/").pop()}`);
  console.log("  pnpm install");
  console.log("  pnpm run dev");
  console.log();
}

async function main(): Promise<void> {
  const arg = process.argv[2];

  if (arg === "--help" || arg === "-h") {
    console.log(`
Usage: npm create @arche-cms/create-app [project-name]

Creates a new Arche CMS project in the specified directory.
`);
    process.exit(0);
  }

  const projectName = arg || (await ask("Project name", "my-cms"));
  const projectDir = resolve(process.cwd(), projectName);

  if (existsSync(projectDir)) {
    console.error(`Directory already exists: ${projectDir}`);
    process.exit(1);
  }

  console.log(`Creating CMS project: ${projectName}\n`);

  const dbAdapter = await ask("Database adapter (sqlite/postgres)", "sqlite");
  if (!["sqlite", "postgres"].includes(dbAdapter)) {
    console.error(`Invalid database adapter: "${dbAdapter}". Must be "sqlite" or "postgres".`);
    process.exit(1);
  }
  const defaultLocale = await ask("Default locale", "en");

  scaffold(projectDir, { dbAdapter, defaultLocale });
}

main().catch((err: unknown) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
