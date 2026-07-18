/* eslint-disable no-console */

import { generateTypesToFile } from "@arche-cms/generators";
import { SchemaLoader } from "@arche-cms/schema";

export interface GenerateOptions {
  dir?: string | undefined;
  out?: string | undefined;
}

export function printGenerateHelp(): void {
  console.log(`
Usage: cms generate [options]

Run all code generation pipelines.

Options:
  --dir <path>   Schema directory (default: ./cms)
  --out <path>   Output directory (default: ./src/__generated__)
  --help         Show this help
`);
  process.exit(0);
}

export async function generate(options: GenerateOptions): Promise<void> {
  const schemaDir = options.dir ?? "cms";
  const outDir = options.out ?? "src/__generated__";

  console.log(`[cms] Loading schemas from ${schemaDir}/...`);

  const loader = new SchemaLoader({ baseDir: schemaDir });
  const schemas = await loader.load();

  const collections = [...schemas.collections.values()];
  const globals = [...schemas.globals.values()];
  const components = [...schemas.components.values()];

  console.log(
    `[cms] Found ${collections.length} collection(s), ${globals.length} global(s), ${components.length} component(s)`,
  );

  if (collections.length > 0 || globals.length > 0 || components.length > 0) {
    console.log("[cms] Generating TypeScript types...");
    await generateTypesToFile({
      collections,
      components,
      globals,
      outputPath: `${outDir}/types.ts`,
    });
    console.log(`[cms]   → ${outDir}/types.ts`);
  }

  console.log("[cms] Code generation complete");
}
