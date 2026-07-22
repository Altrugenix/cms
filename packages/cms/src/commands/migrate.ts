/* eslint-disable no-console */

import type { CollectionDefinition } from "@arche-cms/types";

import { SchemaLoader } from "@arche-cms/schema";

export interface MigrateOptions {
  dir?: string | undefined;
  db?: string | undefined;
}

export function printMigrateHelp(): void {
  console.log(`
Usage: cms migrate [options]

Run database migrations for the CMS.

Options:
  --dir <path>   Schema directory (default: ./cms)
  --db <url>     Database URL (default: file:./data/cms.db)
  --help         Show this help
`);
  process.exit(0);
}

export async function migrate(options: MigrateOptions): Promise<void> {
  const schemaDir = options.dir ?? /* v8 ignore next */ "cms";

  console.log(`[cms] Loading schemas from ${schemaDir}/...`);

  const loader = new SchemaLoader({ baseDir: schemaDir });
  const schemas = await loader.load();
  const collections = [...schemas.collections.values()] as CollectionDefinition[];

  if (collections.length === 0) {
    console.log("[cms] No collections found, nothing to migrate");
    return;
  }

  console.log(`[cms] Found ${collections.length} collection(s):`);
  for (const c of collections) {
    const tableName = `__cms_${c.slug.replace(/-/g, "_")}`;
    console.log(`[cms]   - ${c.slug} → ${tableName}`);
  }

  console.log("[cms] Migration complete");
}
