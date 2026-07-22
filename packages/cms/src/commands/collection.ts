/* eslint-disable no-console */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { collectionTemplate, collectionCreateHelp } from "../templates/templates.js";

export interface CollectionCreateOptions {
  slug: string;
  dir?: string | undefined;
}

export async function collectionCreate(options: CollectionCreateOptions): Promise<void> {
  const slug = validateSlug(options.slug);
  const outDir = resolve(options.dir ?? /* v8 ignore next */ "cms/collections");
  const filePath = resolve(outDir, `${slug}.ts`);

  await mkdir(outDir, { recursive: true });
  await writeFile(filePath, collectionTemplate(slug), "utf-8");

  console.log(`Created collection: ${filePath}`);
}

export function printCollectionCreateHelp(): void {
  console.log(collectionCreateHelp());
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
