import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";

import type { Generator, GeneratedFile, GenerationOptions } from "./generator.js";

export interface PipelineOptions {
  outputDir: string;
}

export class GenerationPipeline {
  private generators: Generator[] = [];

  register(generator: Generator): void {
    this.generators.push(generator);
  }

  async run(options: GenerationOptions): Promise<void> {
    const results: Array<{ generator: string; files: GeneratedFile[] }> = [];

    for (const gen of this.generators) {
      const files = await gen.generate(options);
      results.push({ files, generator: gen.name });
    }

    for (const { files } of results) {
      for (const file of files) {
        const fullPath = join(options.outputDir, file.path);
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, file.content, "utf-8");
      }
    }
  }
}
