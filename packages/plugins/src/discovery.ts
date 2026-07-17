import type { PluginDefinition } from "@arche-cms/types";

import { readdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const PLUGIN_PREFIXES = ["@arche-cms/plugin-", "arche-cms-plugin-"];

export interface DiscoveredPlugin {
  slug: string;
  path: string;
  definition: PluginDefinition;
}

export async function discoverPlugins(fromDir?: string): Promise<DiscoveredPlugin[]> {
  const searchDir = fromDir ?? process.cwd();
  const nodeModulesDir = resolve(searchDir, "node_modules");
  const results: DiscoveredPlugin[] = [];

  try {
    const entries = await readdir(nodeModulesDir, { withFileTypes: true });
    const promises: Promise<void>[] = [];

    for (const entry of entries) {
      const fullName = entry.name;

      const matchedPrefix = PLUGIN_PREFIXES.find((p) => fullName.startsWith(p));
      if (!matchedPrefix) continue;

      const slug = fullName.slice(matchedPrefix.length);
      const pkgPath = resolve(nodeModulesDir, fullName);

      if (entry.isSymbolicLink() || entry.isDirectory()) {
        promises.push(
          loadPluginDefinition(pkgPath, slug).then((def) => {
            if (def) results.push(def);
          }),
        );
      }
    }

    await Promise.all(promises);
  } catch {
    // node_modules doesn't exist yet
  }

  return results;
}

async function loadPluginDefinition(
  pkgPath: string,
  slug: string,
): Promise<DiscoveredPlugin | null> {
  try {
    const mod = await import(join(pkgPath, "dist/index.js"));
    const def = mod.default ?? mod;
    if (def && typeof def === "object" && def.slug && def.name) {
      return { definition: def as PluginDefinition, path: pkgPath, slug };
    }
  } catch {
    try {
      const pkg = await import(join(pkgPath, "package.json"), { with: { type: "json" } });
      const main = (pkg as { default?: { main?: string } })?.default?.main ?? "dist/index.js";
      const mod = await import(join(pkgPath, main));
      const def = mod.default ?? mod;
      if (def && typeof def === "object" && def.slug && def.name) {
        return { definition: def as PluginDefinition, path: pkgPath, slug };
      }
    } catch {
      return null;
    }
  }
  return null;
}
