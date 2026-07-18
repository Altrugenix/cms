import type { CollectionDefinition, GlobalDefinition, ComponentDefinition } from "@arche-cms/types";

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerationOptions {
  collections?: CollectionDefinition[] | undefined;
  globals?: GlobalDefinition[] | undefined;
  components?: ComponentDefinition[] | undefined;
  outputDir: string;
}

export interface Generator {
  name: string;
  description: string;
  generate(options: GenerationOptions): Promise<GeneratedFile[]>;
}
