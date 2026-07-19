/* eslint-disable no-console */

import type { CollectionDefinition, GlobalDefinition, ComponentDefinition } from "@arche-cms/types";

import {
  GenerationPipeline,
  sdkGenerator,
  validationGenerator,
  generateTypesToFile,
} from "@arche-cms/generators";
import { SchemaLoader } from "@arche-cms/schema";

export interface GenerateOptions {
  dir?: string | undefined;
  out?: string | undefined;
  generators?: string[] | undefined;
}

const allGenerators = {
  sdk: sdkGenerator,
  types: async (opts: {
    out: string;
    collections: CollectionDefinition[];
    globals: GlobalDefinition[];
    components: ComponentDefinition[];
  }) => {
    await generateTypesToFile({
      collections: opts.collections,
      components: opts.components,
      globals: opts.globals,
      outputPath: `${opts.out}/types.ts`,
    });
    console.log(`[cms]   → ${opts.out}/types.ts`);
  },
  validation: validationGenerator,
};

type GeneratorName = keyof typeof allGenerators;

function isGeneratorName(name: string): name is GeneratorName {
  return name in allGenerators;
}

export function printGenerateHelp(): void {
  console.log(`
Usage: cms generate [options] [generators...]

Run code generation pipelines.

Generators:
  types        Generate TypeScript type interfaces (default)
  sdk          Generate typed SDK client
  validation   Generate Zod validation schemas

Options:
  --dir <path>           Schema directory (default: ./cms)
  --out <path>           Output directory (default: ./src/__generated__)
  --generators <list>    Comma-separated list of generators to run (default: all)
  --help                 Show this help

Examples:
  cms generate                           Run all generators
  cms generate types sdk                 Run types and SDK only
  cms generate --generators sdk          Run SDK generator only
  cms generate sdk validation            Run SDK and validation generators
  cms generate --generators types,validation
`);
  process.exit(0);
}

export async function generate(options: GenerateOptions): Promise<void> {
  const schemaDir = options.dir ?? "cms";
  const outDir = options.out ?? "src/__generated__";

  // Determine which generators to run
  const generatorNames: GeneratorName[] =
    options.generators && options.generators.length > 0
      ? options.generators.filter(isGeneratorName)
      : ["types", "sdk", "validation"];

  if (options.generators && options.generators.length > 0 && generatorNames.length === 0) {
    console.error("[cms] No valid generators specified. Available: types, sdk, validation");
    process.exit(1);
  }

  console.log(`[cms] Loading schemas from ${schemaDir}/...`);

  const loader = new SchemaLoader({ baseDir: schemaDir });
  const schemas = await loader.load();

  const collections = [...schemas.collections.values()];
  const globals = [...schemas.globals.values()];
  const components = [...schemas.components.values()];

  console.log(
    `[cms] Found ${collections.length} collection(s), ${globals.length} global(s), ${components.length} component(s)`,
  );

  console.log(`[cms] Running generators: ${generatorNames.join(", ")}`);

  for (const name of generatorNames) {
    if (name === "types") {
      await allGenerators.types({ collections, components, globals, out: outDir });
    } else if (name === "sdk") {
      const pipeline = new GenerationPipeline();
      pipeline.register(sdkGenerator);
      await pipeline.run({ collections, globals, outputDir: outDir });
      console.log(`[cms]   → ${outDir}/sdk/index.ts`);
    } else {
      const pipeline = new GenerationPipeline();
      pipeline.register(validationGenerator);
      await pipeline.run({ collections, globals, outputDir: outDir });
      console.log(`[cms]   → ${outDir}/validation/`);
    }
  }

  console.log("[cms] Code generation complete");
}
