import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

let tsxRegistered = false;
async function ensureTsSupport(): Promise<void> {
  if (tsxRegistered) return;
  try {
    // @ts-expect-error — tsx/esm has no types, but it's a side-effect hook
    await import("tsx/esm");
  } catch {
    // tsx not available — rely on native TS support (Node 22+)
  }
  tsxRegistered = true;
}
import type { CollectionDefinition, GlobalDefinition, ComponentDefinition } from "@arche-cms/types";

interface WithSlug {
  slug: string;
  fields?: unknown[];
}

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

    const [collections, globals, components] = await Promise.all([
      this.loadCollections(),
      this.loadGlobals(),
      this.loadComponents(),
    ]);

    const result = { collections, globals, components };

    if (this.options.onAfterLoad) await this.options.onAfterLoad(result);

    return result;
  }

  private async loadFromDir<T extends WithSlug>(
    dirName: string,
    validate: (def: unknown) => def is T,
  ): Promise<Map<string, T>> {
    const map = new Map<string, T>();
    const dir = resolve(this.baseDir, dirName);

    try {
      const files = await readdir(dir);
      const filtered = files.filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
      if (filtered.length === 0) return map;

      if (filtered.some((f) => f.endsWith(".ts"))) await ensureTsSupport();

      const mods = await Promise.all(
        filtered.map((file) => {
          const filePath = resolve(dir, file);
          const url = new URL(pathToFileURL(filePath).href);
          url.searchParams.set("t", String(Date.now()));
          return import(url.href);
        }),
      );

      for (const mod of mods) {
        const def = mod.default ?? mod;
        if (validate(def)) {
          map.set(def.slug, def);
        }
      }
    } catch {
      // Directory doesn't exist yet
    }

    return map;
  }

  private loadCollections(): Promise<Map<string, CollectionDefinition>> {
    return this.loadFromDir(
      "collections",
      (def): def is CollectionDefinition =>
        typeof def === "object" && def !== null && "slug" in def,
    );
  }

  private loadGlobals(): Promise<Map<string, GlobalDefinition>> {
    return this.loadFromDir(
      "globals",
      (def): def is GlobalDefinition => typeof def === "object" && def !== null && "slug" in def,
    );
  }

  private loadComponents(): Promise<Map<string, ComponentDefinition>> {
    return this.loadFromDir(
      "components",
      (def): def is ComponentDefinition => typeof def === "object" && def !== null && "slug" in def,
    );
  }
}
