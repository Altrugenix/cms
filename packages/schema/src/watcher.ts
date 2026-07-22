import type { CollectionDefinition, GlobalDefinition, ComponentDefinition } from "@arche-cms/types";

import { EventEmitter } from "node:events";
import { watch, existsSync, mkdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

type SchemaCategory = "collections" | "globals" | "components";
type SchemaDefinition = CollectionDefinition | GlobalDefinition | ComponentDefinition;

export interface SchemaChangeEvent {
  type: "added" | "changed" | "removed";
  category: SchemaCategory;
  slug: string;
  definition?: SchemaDefinition | undefined;
}

const CATEGORY_DIRS: SchemaCategory[] = ["collections", "globals", "components"];
const DEBOUNCE_MS = 100;

function resolveCategory(filePath: string, baseDir: string): SchemaCategory | null {
  const rel = relative(baseDir, filePath);
  for (const cat of CATEGORY_DIRS) {
    if (rel.startsWith(cat + "/") || rel.startsWith(cat + "\\")) return cat;
  }
  return null;
}

function slugFromFile(filePath: string): string {
  return (
    filePath
      .replace(/\.(ts|js)$/, "")
      .split(/[/\\]/)
      .pop() ?? /* v8 ignore next -- unreachable, split always returns non-empty */ ""
  );
}

export class SchemaWatcher extends EventEmitter {
  private readonly baseDir: string;
  private abortController: AbortController | null = null;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(baseDir: string) {
    super();
    this.baseDir = resolve(baseDir);
  }

  async start(): Promise<void> {
    if (this.abortController) return;
    this.abortController = new AbortController();

    const ac = this.abortController;
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
    try {
      const watcher = watch(this.baseDir, { recursive: true, signal: ac.signal });
      watcher.on("change", (_event, filename) => {
        if (!filename || typeof filename !== "string") return;
        if (!filename.endsWith(".ts") && !filename.endsWith(".js")) return;

        const category = resolveCategory(filename, "");
        if (!category) return;

        const existing = this.debounceTimers.get(filename);
        if (existing) clearTimeout(existing);

        this.debounceTimers.set(
          filename,
          setTimeout(() => {
            this.debounceTimers.delete(filename);
            const slug = slugFromFile(filename);
            const fullPath = resolve(this.baseDir, filename);
            void this.handleChange(category, slug, fullPath);
          }, DEBOUNCE_MS),
        );
      });
    } catch (err) {
      // Directory may not exist yet
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async stop(): Promise<void> {
    this.abortController?.abort();
    this.abortController = null;
    for (const timer of this.debounceTimers.values()) clearTimeout(timer);
    this.debounceTimers.clear();
  }

  private async handleChange(
    category: SchemaCategory,
    slug: string,
    fullPath: string,
  ): Promise<void> {
    try {
      const url = new URL(pathToFileURL(fullPath).href);
      url.searchParams.set("t", String(Date.now()));
      const mod = (await import(url.href)) as Record<string, unknown>;
      const def = (mod.default ?? mod) as Record<string, unknown>;
      if (def && typeof def === "object" && "slug" in def) {
        this.emit("change", {
          category,
          definition: def as unknown as SchemaDefinition,
          slug: (def.slug as string) ?? slug,
          type: "changed",
        } satisfies SchemaChangeEvent);
      }
    } catch {
      // File may have been deleted or contains errors
      this.emit("change", {
        category,
        slug,
        type: "removed",
      } satisfies SchemaChangeEvent);
    }
  }
}
