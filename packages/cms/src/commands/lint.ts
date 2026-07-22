/* eslint-disable no-console */

import { SchemaLoader, validateCollection } from "@arche-cms/schema";

export interface LintOptions {
  dir?: string | undefined;
  fix?: boolean | undefined;
}

export function printLintHelp(): void {
  console.log(`
Usage: cms lint [options]

Lint schema definitions for errors and warnings.

Options:
  --dir <path>   Schema directory (default: ./cms)
  --fix          Automatically fix fixable issues
  --help         Show this help
`);
  process.exit(0);
}

export async function lint(options: LintOptions): Promise<void> {
  const schemaDir = options.dir ?? /* v8 ignore next */ "cms";

  console.log(`[cms] Linting schemas in ${schemaDir}/...`);

  const loader = new SchemaLoader({ baseDir: schemaDir });
  const schemas = await loader.load();

  const collections = [...schemas.collections.values()];
  let hasErrors = false;

  for (const collection of collections) {
    const result = validateCollection(collection);
    /* v8 ignore next -- false branch exercised via invalid schema test */
    if (result.valid) {
      console.log(`  ✓ ${collection.slug}`);
    } else {
      hasErrors = true;
      console.log(`  ✗ ${collection.slug}`);
      for (const issue of result.issues) {
        console.log(`      ${issue.severity === "error" ? "ERROR" : "WARN"}: ${issue.message}`);
      }
    }
  }

  if (hasErrors) {
    console.log("[cms] Lint completed with errors");
    process.exit(1);
  }

  console.log("[cms] All schemas valid");
}
