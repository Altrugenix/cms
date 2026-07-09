import type {
  CollectionDefinition,
  GlobalDefinition,
  ComponentDefinition,
} from "@altrugenix/types";

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface GenerationOptions {
  collections?: CollectionDefinition[];
  globals?: GlobalDefinition[];
  components?: ComponentDefinition[];
  outputDir: string;
}

export interface Generator {
  name: string;
  description: string;
  generate(options: GenerationOptions): Promise<GeneratedFile[]>;
}
