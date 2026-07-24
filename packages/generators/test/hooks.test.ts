import { describe, it, expect } from "vitest";

import { hooksGenerator } from "../src/hooks.js";

describe("hooksGenerator", () => {
  it("returns empty array when no collections or globals", async () => {
    const files = await hooksGenerator.generate({
      collections: [],
      globals: [],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(0);
  });

  it("generates a single hooks/index.ts file", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("hooks/index.ts");
  });

  it("imports from @tanstack/react-query and @arche-cms/sdk", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain('from "@tanstack/react-query"');
    expect(content).toContain('from "@arche-cms/sdk"');
  });

  it("generates initHooks function", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export function initHooks(archeClient: ArcheClient): void");
  });

  it("generates collection interfaces with correct field types", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [
            { name: "title", type: "text", validation: { required: true } },
            { name: "slug", type: "slug" },
            { name: "content", type: "richText" },
            { name: "order", type: "number" },
            { name: "featured", type: "boolean" },
          ],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export interface Posts {");
    expect(content).toContain("  title: string;");
    expect(content).toContain("  slug?: string;");
    expect(content).toContain("  content?: unknown;");
    expect(content).toContain("  order?: number;");
    expect(content).toContain("  featured?: boolean;");
  });

  it("generates global interfaces with Globals suffix", async () => {
    const files = await hooksGenerator.generate({
      collections: [],
      globals: [
        {
          fields: [
            { name: "siteName", type: "text", validation: { required: true } },
            { name: "logo", type: "media" },
          ],
          label: "Site Settings",
          slug: "site-settings",
        },
      ],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export interface SiteSettingsGlobals {");
    expect(content).toContain("  siteName: string;");
    expect(content).toContain("  logo?: string;");
  });

  it("generates CollectionTypeMap", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export interface CollectionTypeMap {");
    expect(content).toContain('"posts": Posts;');
  });

  it("generates GlobalTypeMap", async () => {
    const files = await hooksGenerator.generate({
      collections: [],
      globals: [
        {
          fields: [{ name: "logo", type: "media" }],
          label: "Site Settings",
          slug: "site-settings",
        },
      ],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export interface GlobalTypeMap {");
    expect(content).toContain('"site-settings": SiteSettingsGlobals;');
  });

  it("generates collection query hooks (list, get)", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export function usePostsList(");
    expect(content).toContain("export function usePostsGet(");
    expect(content).toContain("useQuery(");
  });

  it("generates collection mutation hooks (create, update, delete, bulkDelete, publish, unpublish, restore)", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export function usePostsCreate(");
    expect(content).toContain("export function usePostsUpdate(");
    expect(content).toContain("export function usePostsDelete(");
    expect(content).toContain("export function usePostsBulkDelete(");
    expect(content).toContain("export function usePostsPublish(");
    expect(content).toContain("export function usePostsUnpublish(");
    expect(content).toContain("export function usePostsRestore(");
    expect(content).toContain("useMutation(");
  });

  it("generates query key factories for collections", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export const usePostsKeys = {");
    expect(content).toContain('all: ["posts"]');
    expect(content).toContain("lists: ()");
    expect(content).toContain("details: ()");
  });

  it("generates global query and mutation hooks (get, upsert)", async () => {
    const files = await hooksGenerator.generate({
      collections: [],
      globals: [
        {
          fields: [{ name: "logo", type: "media" }],
          label: "Site Settings",
          slug: "site-settings",
        },
      ],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export function useSiteSettingsGet(");
    expect(content).toContain("export function useSiteSettingsUpsert(");
  });

  it("generates query key factories for globals", async () => {
    const files = await hooksGenerator.generate({
      collections: [],
      globals: [
        {
          fields: [{ name: "logo", type: "media" }],
          label: "Site Settings",
          slug: "site-settings",
        },
      ],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export const useSiteSettingsKeys = {");
    expect(content).toContain('all: ["site-settings"]');
  });

  it("generates cache invalidation in mutation hooks", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("invalidateQueries({ queryKey: usePostsKeys.all })");
  });

  it("generates hooks for mixed collections and globals", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [
        {
          fields: [{ name: "logo", type: "media" }],
          label: "Site Settings",
          slug: "site-settings",
        },
      ],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("export function usePostsList(");
    expect(content).toContain("export function useSiteSettingsGet(");
    expect(content).toContain("export interface CollectionTypeMap {");
    expect(content).toContain("export interface GlobalTypeMap {");
  });

  it("generates correct TypeScript types for mutations", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text", validation: { required: true } }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    // create takes Partial<T>
    expect(content).toContain("UseMutationOptions<Posts, Error, Partial<Posts>>");
    // update takes { id, data }
    expect(content).toContain(
      "UseMutationOptions<Posts, Error, { id: string; data: Partial<Posts> }>",
    );
    // delete takes string (id)
    expect(content).toContain("UseMutationOptions<{ message: string }, Error, string>");
    // bulkDelete takes string[]
    expect(content).toContain("UseMutationOptions<{ deleted: number }, Error, string[]>");
  });

  it("generates localized field types", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [
            { localized: true, name: "title", type: "text" },
            { localized: true, name: "content", type: "richText" },
          ],
          labels: { plural: "Localized Posts", singular: "Localized Post" },
          slug: "localized-posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("title?: Record<string, string>;");
    expect(content).toContain("content?: Record<string, unknown>;");
  });

  it("generates relation field types", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [
            { name: "author", to: "users", type: "relation" },
            { kind: "manyToMany", name: "relatedPosts", to: "posts", type: "relation" },
          ],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("author?: string;");
    expect(content).toContain("relatedPosts?: string[];");
  });

  it("generates component/dynamicZone/array/object/repeater field types", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [
            { component: "seo", name: "seo", type: "component" },
            { components: ["hero", "cta"], name: "contentBlocks", type: "dynamicZone" },
            { name: "galleryItems", type: "array" },
            { name: "address", type: "object" },
            { name: "faqs", type: "repeater" },
          ],
          labels: { plural: "Pages", singular: "Page" },
          slug: "pages",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("seo?: Record<string, unknown>;");
    expect(content).toContain("contentBlocks?: Record<string, unknown>[];");
    expect(content).toContain("galleryItems?: Array<Record<string, unknown>>;");
    expect(content).toContain("address?: Record<string, unknown>;");
    expect(content).toContain("faqs?: Array<Record<string, unknown>>;");
  });

  it("generates useQueryClient import for cache invalidation", async () => {
    const files = await hooksGenerator.generate({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      globals: [],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("useQueryClient");
  });
});
