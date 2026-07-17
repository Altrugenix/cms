import type { CollectionDefinition, ComponentDefinition } from "@arche-cms/types";

import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, afterEach } from "vitest";

import { generateTypes, generateTypesToFile } from "../src/typegen.js";

describe("generateTypes", () => {
  it("generates interface for a basic collection", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [
          { name: "title", type: "text" },
          { name: "body", type: "richText" },
          { name: "published", type: "boolean", validation: { required: true } },
        ],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("export interface Posts");
    expect(output).toContain("id: string;");
    expect(output).toContain("title?: string;");
    expect(output).toContain("body?: unknown;");
    expect(output).toContain("published: boolean;");
    expect(output).toContain("createdAt?: string;");
    expect(output).toContain("updatedAt?: string;");
  });

  it("generates interface for a collection with slug field", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [
          { name: "title", type: "text" },
          { name: "path", source: "title", type: "slug" },
        ],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("export interface Pages");
    expect(output).toContain("path?: string;");
  });

  it("generates interface for a global", () => {
    const globals = [
      {
        fields: [
          { name: "siteName", type: "text" },
          { name: "logo", type: "media" },
        ],
        label: "Site Settings",
        slug: "site-settings",
      },
    ];

    const output = generateTypes({ globals, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("export interface SiteSettings");
    expect(output).toContain("siteName?: string;");
    expect(output).toContain("logo?: string;");
  });

  it("generates interface for a component", () => {
    const components: ComponentDefinition[] = [
      {
        fields: [
          { name: "title", type: "text" },
          { name: "description", type: "textarea" },
        ],
        label: "SEO",
        slug: "seo",
      },
    ];

    const output = generateTypes({ components, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("export interface Seo");
    expect(output).toContain("title?: string;");
    expect(output).toContain("description?: string;");
  });

  it("handles relation fields", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [
          { name: "title", type: "text" },
          { name: "author", to: "users", type: "relation" },
          { kind: "manyToMany", name: "tags", to: "tags", type: "relation" },
        ],
        labels: { plural: "Articles", singular: "Article" },
        slug: "articles",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("author?: Users | string;");
    expect(output).toContain("tags?: Tags[];");
  });

  it("generates for multiple collections", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ name: "title", type: "text" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      },
      {
        fields: [{ name: "email", type: "email" }],
        labels: { plural: "Users", singular: "User" },
        slug: "users",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("export interface Posts");
    expect(output).toContain("export interface Users");
  });

  it("includes createdAt/updatedAt based on timestamps config", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ name: "name", type: "text" }],
        labels: { plural: "No Timestamps", singular: "No Timestamp" },
        slug: "no-timestamps",
        timestamps: { createdAt: false, updatedAt: false },
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).not.toContain("createdAt");
    expect(output).not.toContain("updatedAt");
  });

  it("marks optional fields correctly", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [
          { name: "required_field", type: "text", validation: { required: true } },
          { name: "optional_field", type: "text" },
        ],
        labels: { plural: "Items", singular: "Item" },
        slug: "items",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("required_field: string;");
    expect(output).toContain("optional_field?: string;");
  });

  it("handles component fields", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ component: "seo", name: "seo", type: "component" }],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("seo?: Seo;");
  });

  it("handles repeatable component fields", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ component: "block", name: "blocks", repeatable: true, type: "component" }],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("blocks?: Block[];");
  });

  it("handles dynamicZone fields", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ components: ["hero", "text-block"], name: "content", type: "dynamicZone" }],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("content?: Hero | TextBlock;");
  });

  it("handles array fields", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [
          {
            fields: [
              { name: "label", type: "text" },
              { name: "count", type: "number" },
            ],
            name: "items",
            type: "array",
          },
        ],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("items");
  });

  it("handles object and group fields", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [
          { fields: [{ name: "key", type: "text" }], name: "metadata", type: "object" },
          { fields: [{ name: "val", type: "number" }], name: "group", type: "group" },
        ],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("metadata");
    expect(output).toContain("group");
  });

  it("handles repeater fields", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ fields: [{ name: "name", type: "text" }], name: "items", type: "repeater" }],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("items");
  });

  it("handles tabs fields", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [
          {
            name: "tab_fields",
            tabs: [
              {
                fields: [
                  { name: "title", type: "text" },
                  { name: "body", type: "richText" },
                ],
                label: "Content",
              },
            ],
            type: "tabs",
          },
        ],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("tab_fields");
  });

  it("handles unknown field type via default", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ name: "custom", type: "unknown-type" as never }],
        labels: { plural: "Tests", singular: "Test" },
        slug: "test",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("custom?: unknown;");
  });

  it("handles localized fields", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [
          { localized: true, name: "title", type: "text" },
          { localized: true, name: "body", type: "richText" },
          { localized: true, name: "count", type: "number" },
        ],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("title?: Record<string, string>;");
    expect(output).toContain("body?: Record<string, unknown>;");
    expect(output).toContain("count?: Record<string, number>;");
  });

  it("handles localized relation field via switch path", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ localized: true, name: "author", to: "users", type: "relation" }],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("author?: Record<string, Users | string>;");
  });

  it("handles localized component field via switch path", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ component: "seo", localized: true, name: "seo", type: "component" }],
        labels: { plural: "Pages", singular: "Page" },
        slug: "pages",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("seo?: Record<string, Seo>;");
  });

  it("handles manyToOne relation", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ kind: "manyToOne", name: "author", to: "users", type: "relation" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("author?: Users | string;");
  });
});

describe("generateTypesToFile", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { force: true, recursive: true });
  });

  it("writes generated types to a file", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "typegen-test-"));
    const outPath = join(tmpDir, "generated", "types.ts");

    const collections: CollectionDefinition[] = [
      {
        fields: [{ name: "title", type: "text" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      },
    ];

    await generateTypesToFile({ collections, outputPath: outPath });

    const content = await readFile(outPath, "utf-8");
    expect(content).toContain("export interface Posts");
    expect(content).toContain("title?: string;");
    expect(content).toContain("id: string;");
  });

  it("creates parent directories recursively", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "typegen-nested-"));
    const outPath = join(tmpDir, "a", "b", "c", "types.ts");

    await generateTypesToFile({ collections: [], outputPath: outPath });

    const content = await readFile(outPath, "utf-8");
    expect(content).toContain("Auto-generated");
  });
});
