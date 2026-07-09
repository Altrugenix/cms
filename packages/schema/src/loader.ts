import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  CollectionDefinition,
  GlobalDefinition,
  ComponentDefinition,
} from "@altrugenix/types";

export interface SchemaLoaderOptions {
  baseDir: string;
  watch?: boolean;
  onBeforeLoad?: () => Promise<void>;
  onAfterLoad?: (schema: {
    collections: Map<string, CollectionDefinition>;
    globals: Map<string, GlobalDefinition>;
    components: Map<string, ComponentDefinition>;
  }) => Promise<void>;
}

export interface LoadedSchema {
  collections: Map<string, CollectionDefinition>;
  globals: Map<string, GlobalDefinition>;
  components: Map<string, ComponentDefinition>;
}

export class SchemaLoader {
  private readonly baseDir: string;
  private readonly options: SchemaLoaderOptions;

  constructor(options: SchemaLoaderOptions) {
    this.baseDir = resolve(options.baseDir);
    this.options = options;
  }

  async load(): Promise<LoadedSchema> {
    if (this.options.onBeforeLoad) await this.options.onBeforeLoad();

    const collections = await this.loadCollections();
    const globals = await this.loadGlobals();
    const components = await this.loadComponents();

    const result = { collections, globals, components };

    if (this.options.onAfterLoad) await this.options.onAfterLoad(result);

    return result;
  }

  private async loadCollections(): Promise<Map<string, CollectionDefinition>> {
    const map = new Map<string, CollectionDefinition>();
    const dir = resolve(this.baseDir, "collections");

    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
        const mod = await import(resolve(dir, file));
        const def = mod.default ?? mod;
        if (def && typeof def === "object" && "slug" in def && "fields" in def) {
          map.set(def.slug, def as CollectionDefinition);
        }
      }
    } catch {
      // Collections directory doesn't exist yet
    }

    return map;
  }

  private async loadGlobals(): Promise<Map<string, GlobalDefinition>> {
    const map = new Map<string, GlobalDefinition>();
    const dir = resolve(this.baseDir, "globals");

    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
        const mod = await import(resolve(dir, file));
        const def = mod.default ?? mod;
        if (def && typeof def === "object" && "slug" in def && "fields" in def) {
          map.set(def.slug, def as GlobalDefinition);
        }
      }
    } catch {
      // Globals directory doesn't exist yet
    }

    return map;
  }

  private async loadComponents(): Promise<Map<string, ComponentDefinition>> {
    const map = new Map<string, ComponentDefinition>();
    const dir = resolve(this.baseDir, "components");

    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
        const mod = await import(resolve(dir, file));
        const def = mod.default ?? mod;
        if (def && typeof def === "object" && "slug" in def && "fields" in def) {
          map.set(def.slug, def as ComponentDefinition);
        }
      }
    } catch {
      // Components directory doesn't exist yet
    }

    return map;
  }
}
