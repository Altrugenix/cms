import { describe, it, expect } from "vitest";
import { generateTypes } from "../src/typegen.js";
import type { CollectionDefinition, ComponentDefinition } from "@altrugenix/types";

describe("generateTypes", () => {
  it("generates interface for a basic collection", () => {
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [
          { name: "title", type: "text" },
          { name: "body", type: "richText" },
          { name: "published", type: "boolean", validation: { required: true } },
        ],
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
        slug: "pages",
        labels: { singular: "Page", plural: "Pages" },
        fields: [
          { name: "title", type: "text" },
          { name: "path", type: "slug", source: "title" },
        ],
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("export interface Pages");
    expect(output).toContain("path?: string;");
  });

  it("generates interface for a global", () => {
    const globals = [
      {
        slug: "site-settings",
        label: "Site Settings",
        fields: [
          { name: "siteName", type: "text" },
          { name: "logo", type: "media" },
        ],
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
        slug: "seo",
        label: "SEO",
        fields: [
          { name: "title", type: "text" },
          { name: "description", type: "textarea" },
        ],
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
        slug: "articles",
        labels: { singular: "Article", plural: "Articles" },
        fields: [
          { name: "title", type: "text" },
          { name: "author", type: "relation", to: "users" },
          { name: "tags", type: "relation", to: "tags", kind: "manyToMany" },
        ],
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("author?: Users | string;");
    expect(output).toContain("tags?: Tags[];");
  });

  it("generates for multiple collections", () => {
    const collections: CollectionDefinition[] = [
      {
        slug: "posts",
        labels: { singular: "Post", plural: "Posts" },
        fields: [{ name: "title", type: "text" }],
      },
      {
        slug: "users",
        labels: { singular: "User", plural: "Users" },
        fields: [{ name: "email", type: "email" }],
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("export interface Posts");
    expect(output).toContain("export interface Users");
  });

  it("includes createdAt/updatedAt based on timestamps config", () => {
    const collections: CollectionDefinition[] = [
      {
        slug: "no-timestamps",
        labels: { singular: "No Timestamp", plural: "No Timestamps" },
        fields: [{ name: "name", type: "text" }],
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
        slug: "items",
        labels: { singular: "Item", plural: "Items" },
        fields: [
          { name: "required_field", type: "text", validation: { required: true } },
          { name: "optional_field", type: "text" },
        ],
      },
    ];

    const output = generateTypes({ collections, outputPath: "cms/generated/types.ts" });
    expect(output).toContain("required_field: string;");
    expect(output).toContain("optional_field?: string;");
  });
});
