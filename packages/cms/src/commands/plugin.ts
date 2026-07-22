/* eslint-disable no-console */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { pluginTemplate, pluginCreateHelp } from "../templates/templates.js";

export interface PluginCreateOptions {
  slug: string;
  dir?: string | undefined;
}

export async function pluginCreate(options: PluginCreateOptions): Promise<void> {
  const slug = validateSlug(options.slug);
  const baseDir = resolve(options.dir ?? /* v8 ignore next */ "packages/plugins", slug);

  const { files } = pluginTemplate(slug);

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = resolve(baseDir, filePath);
    await mkdir(resolve(fullPath, ".."), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
  }

  console.log(`Created plugin: ${baseDir}`);
}

export function printPluginCreateHelp(): void {
  console.log(pluginCreateHelp());
  process.exit(0);
}

function validateSlug(slug: string): string {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) {
    console.error("Error: slug is required");
    process.exit(1);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(trimmed)) {
    console.error(
      "Error: slug must start with a letter and contain only lowercase letters, numbers, and hyphens",
    );
    process.exit(1);
  }
  return trimmed;
}
