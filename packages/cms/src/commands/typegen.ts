/* eslint-disable no-console */

import { generateTypesToFile } from "@arche-cms/generators";
import { SchemaLoader } from "@arche-cms/schema";

export interface TypegenOptions {
  dir?: string | undefined;
  out?: string | undefined;
}

export function printTypegenHelp(): void {
  console.log(`
Usage: cms typegen [options]

Generate TypeScript types from schema definitions.

Options:
  --dir <path>   Schema directory (default: ./cms)
  --out <path>   Output file path (default: ./src/__generated__/types.ts)
  --help         Show this help
`);
  process.exit(0);
}

export async function typegen(options: TypegenOptions): Promise<void> {
  const schemaDir = options.dir ?? /* v8 ignore next */ "cms";
  const outPath = options.out ?? /* v8 ignore next */ "src/__generated__/types.ts";

  console.log(`[cms] Loading schemas from ${schemaDir}/...`);

  const loader = new SchemaLoader({ baseDir: schemaDir });
  const schemas = await loader.load();

  const collections = [...schemas.collections.values()];
  const globals = [...schemas.globals.values()];
  const components = [...schemas.components.values()];

  await generateTypesToFile({ collections, components, globals, outputPath: outPath });

  console.log(`[cms] Types generated to ${outPath}`);
}
