import { describe, it, expect } from "vitest";

import { sdkGenerator } from "../src/sdk.js";

/** Playground-like schemas matching apps/playground/cms/collections/posts.ts */
const postsCollection = {
  fields: [
    { name: "title", type: "text" },
    { name: "slug", type: "slug" },
    { name: "content", type: "richText" },
    { name: "status", options: ["draft", "published"], type: "select" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

/** Playground-like schema matching apps/playground/cms/collections/all-fields.ts */
const allFieldsCollection = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "excerpt", type: "textarea" },
    { name: "order", type: "number" },
    { name: "featured", type: "boolean" },
    { name: "publishDate", type: "date" },
    { name: "scheduledAt", type: "datetime" },
    { name: "contactEmail", type: "email" },
    { name: "secretKey", type: "password" },
    { name: "website", type: "url" },
    { name: "metadata", type: "json" },
    { name: "content", type: "richText" },
    { name: "notes", type: "markdown" },
    { name: "snippet", type: "code" },
    { name: "brandColor", type: "color" },
    { name: "featuredImage", type: "media" },
    { multiple: true, name: "gallery", type: "media" },
    { name: "attachment", type: "upload" },
    { name: "status", type: "select" },
    { name: "tags", type: "multiSelect" },
    { name: "priority", type: "radio" },
    { name: "published", type: "checkbox" },
    { name: "author", to: "users", type: "relation" },
    { kind: "manyToMany", name: "relatedPosts", to: "posts", type: "relation" },
    { component: "seo", name: "seo", type: "component" },
    { components: ["seo", "media-card"], name: "contentBlocks", type: "dynamicZone" },
    { name: "galleryItems", type: "array" },
    { name: "address", type: "object" },
    { name: "faqs", type: "repeater" },
  ],
  labels: { plural: "All Fields", singular: "All Field" },
  slug: "all-fields",
};

/** Playground-like global matching apps/playground/cms/globals/site-settings.ts */
const siteSettingsGlobal = {
  fields: [
    { name: "siteName", type: "text", validation: { required: true } },
    { name: "siteDescription", type: "textarea" },
    { name: "adminEmail", type: "email" },
    { name: "defaultLocale", type: "select" },
    { name: "seoTitle", type: "text" },
    { name: "seoDescription", type: "textarea" },
  ],
  label: "Site Settings",
  slug: "site-settings",
};

describe("SDK generator - playground schema compilation", () => {
  it("generates valid SDK output for posts collection", async () => {
    const files = await sdkGenerator.generate({
      collections: [postsCollection],
      globals: [],
      outputDir: "/tmp",
    });

    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";

    // Interfaces
    expect(content).toContain("export interface Posts {");
    expect(content).toContain("id: string;");
    expect(content).toContain("title?: string;");
    expect(content).toContain("slug?: string;");
    expect(content).toContain("status?: string;");

    // Type map
    expect(content).toContain("export interface CollectionTypeMap {");
    expect(content).toContain('"posts": Posts;');

    // Typed client
    expect(content).toContain("export interface TypedClient extends ArcheClient {");
    expect(content).toContain(
      'posts: import("@arche-cms/sdk").CollectionClient<CollectionTypeMap["posts"]>;',
    );

    // createTypedClient
    expect(content).toContain("export function createTypedClient(");
    expect(content).toContain('posts: client.collection("posts") as');
  });

  it("generates valid SDK output for all-fields collection with all field types", async () => {
    const files = await sdkGenerator.generate({
      collections: [allFieldsCollection],
      globals: [],
      outputDir: "/tmp",
    });

    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";

    // Required field should not have `?`
    expect(content).toContain("  title: string;");

    // Optional fields should have `?`
    expect(content).toContain("  excerpt?: string;");
    expect(content).toContain("  order?: number;");
    expect(content).toContain("  featured?: boolean;");
    expect(content).toContain("  publishDate?: string;");
    expect(content).toContain("  scheduledAt?: string;");
    expect(content).toContain("  contactEmail?: string;");
    expect(content).toContain("  secretKey?: string;");
    expect(content).toContain("  website?: string;");
    expect(content).toContain("  metadata?: Record<string, unknown>;");
    expect(content).toContain("  notes?: string;");
    expect(content).toContain("  snippet?: string;");
    expect(content).toContain("  brandColor?: string;");
    expect(content).toContain("  featuredImage?: string;");
    expect(content).toContain("  status?: string;");
    expect(content).toContain("  tags?: string[];");
    expect(content).toContain("  priority?: string;");
    expect(content).toContain("  published?: boolean;");

    // Relation types
    expect(content).toContain("  author?: string;");
    expect(content).toContain("  relatedPosts?: string[];");

    // Component/dynamic zone/array/object/repeater
    expect(content).toContain("  seo?: Record<string, unknown>;");
    expect(content).toContain("  contentBlocks?: Record<string, unknown>[];");
    expect(content).toContain("  galleryItems?: Array<Record<string, unknown>>;");
    expect(content).toContain("  address?: Record<string, unknown>;");
    expect(content).toContain("  faqs?: Array<Record<string, unknown>>;");
  });

  it("generates valid SDK output for global types", async () => {
    const files = await sdkGenerator.generate({
      collections: [],
      globals: [siteSettingsGlobal],
      outputDir: "/tmp",
    });

    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";

    // Interface with Globals suffix
    expect(content).toContain("export interface SiteSettingsGlobals {");
    expect(content).toContain("siteName: string;");
    expect(content).toContain("siteDescription?: string;");
    expect(content).toContain("adminEmail?: string;");
    expect(content).toContain("defaultLocale?: string;");
    expect(content).toContain("seoTitle?: string;");
    expect(content).toContain("seoDescription?: string;");

    // Global type map
    expect(content).toContain("export interface GlobalTypeMap {");
    expect(content).toContain('"site-settings": SiteSettingsGlobals;');

    // Typed client accessor
    expect(content).toContain(
      // eslint-disable-next-line no-secrets/no-secrets
      '"site-settings": import("@arche-cms/sdk").GlobalClient<GlobalTypeMap["site-settings"]>;',
    );
  });

  it("generates valid SDK output for mixed collections and globals", async () => {
    const files = await sdkGenerator.generate({
      collections: [postsCollection],
      globals: [siteSettingsGlobal],
      outputDir: "/tmp",
    });

    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";

    // Both type maps
    expect(content).toContain("export interface CollectionTypeMap {");
    expect(content).toContain("export interface GlobalTypeMap {");

    // Both accessors in TypedClient
    expect(content).toContain(
      'posts: import("@arche-cms/sdk").CollectionClient<CollectionTypeMap["posts"]>;',
    );
    expect(content).toContain(
      // eslint-disable-next-line no-secrets/no-secrets
      '"site-settings": import("@arche-cms/sdk").GlobalClient<GlobalTypeMap["site-settings"]>;',
    );

    // Both in createTypedClient
    expect(content).toContain('posts: client.collection("posts")');
    expect(content).toContain('client.global("site-settings")');
  });

  it("handles localized fields in SDK output", async () => {
    const localizedCollection = {
      fields: [
        { localized: true, name: "title", type: "text" },
        { localized: true, name: "content", type: "richText" },
      ],
      labels: { plural: "Localized Posts", singular: "Localized Post" },
      slug: "localized-posts",
    };

    const files = await sdkGenerator.generate({
      collections: [localizedCollection],
      globals: [],
      outputDir: "/tmp",
    });

    const content = files[0]?.content ?? "";
    expect(content).toContain("title?: Record<string, string>;");
    expect(content).toContain("content?: Record<string, unknown>;");
  });
});
