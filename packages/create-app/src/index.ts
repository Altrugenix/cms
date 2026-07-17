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
          "@arche-cms/cms": "^0.1.0",
        },
        name: projectDir.split("/").pop() ?? "my-cms-app",
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
      '    select("status", { options: ["draft", "published"], defaultValue: "draft" }),',
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
  const defaultLocale = await ask("Default locale", "en");

  scaffold(projectDir, { dbAdapter, defaultLocale });
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
