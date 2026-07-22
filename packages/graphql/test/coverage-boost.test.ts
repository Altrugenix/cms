import type { CollectionDefinition, GlobalDefinition } from "@arche-cms/types";

import { describe, it, expect, vi } from "vitest";

import { generateResolvers } from "../src/resolvers.js";
import { generateTypeDefs } from "../src/type-defs.js";

const emptyCollection: CollectionDefinition = {
  fields: [],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

const emptyGlobal: GlobalDefinition = {
  fields: [],
  label: "Settings",
  slug: "settings",
};

const draftCollection: CollectionDefinition = {
  fields: [{ name: "title", type: "text" }],
  labels: { plural: "Articles", singular: "Article" },
  slug: "articles",
  versions: { drafts: true },
};

describe("type-defs empty-fields fallbacks", () => {
  it("handles collection with empty fields", () => {
    const defs = generateTypeDefs([emptyCollection]);
    expect(defs).toContain("type Posts {");
    expect(defs).toContain("id: ID!");
  });

  it("handles global with empty fields — placeholder _: Boolean", () => {
    const defs = generateTypeDefs([], [emptyGlobal]);
    expect(defs).toContain("_: Boolean");
  });

  it("handles collection empty fields — filter placeholder _: Boolean", () => {
    const defs = generateTypeDefs([emptyCollection]);
    expect(defs).toContain("input PostsFilter {");
    expect(defs).toContain("_: Boolean");
  });

  it("handles collection empty fields — sort default id_asc/id_desc", () => {
    const defs = generateTypeDefs([emptyCollection]);
    expect(defs).toContain("enum PostsSort {");
    expect(defs).toContain("id_asc");
    expect(defs).toContain("id_desc");
  });

  it("handles collection empty fields — create input placeholder _: String", () => {
    const defs = generateTypeDefs([emptyCollection]);
    expect(defs).toContain("input PostsCreateInput {");
    expect(defs).toContain("_: String");
  });

  it("handles collection empty fields — update input placeholder _: String", () => {
    const defs = generateTypeDefs([emptyCollection]);
    expect(defs).toContain("input PostsUpdateInput {");
    expect(defs).toContain("_: String");
  });

  it("handles global with empty fields — input placeholder _: String", () => {
    const defs = generateTypeDefs([], [emptyGlobal]);
    expect(defs).toContain("input SettingsInput {");
    expect(defs).toContain("_: String");
  });
});

describe("resolvers draft injection", () => {
  function createMockAdapter() {
    const store = new Map<string, Record<string, unknown>>();
    return {
      create: vi.fn(async (_table: string, data: Record<string, unknown>) => {
        const id = String(store.size + 1);
        store.set(id, { id, ...data });
        return { id, ...data };
      }),
      delete: vi.fn(async () => true),
      findMany: vi.fn(async (_table: string, options?: { where?: Record<string, unknown> }) => {
        let rows = [...store.values()];
        if (options?.where) {
          for (const [key, value] of Object.entries(options.where)) {
            rows = rows.filter((r) => r[key] === value);
          }
        }
        return { data: rows, total: rows.length };
      }),
      findOne: vi.fn(async (_table: string, id: string) => store.get(id) ?? null),
      store,
      update: vi.fn(async (_table: string, id: string, data: Record<string, unknown>) => {
        const existing = store.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        store.set(id, updated);
        return updated;
      }),
    };
  }

  it("auto-injects _status: published for draft collections when no filter", async () => {
    const adapter = createMockAdapter();
    const resolvers = generateResolvers([draftCollection], adapter);
    const listFn = resolvers.Query.listArticles as (...args: unknown[]) => unknown;
    await listFn({}, { limit: 10, offset: 0 });
    expect(adapter.findMany).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        where: expect.objectContaining({ _status: "published" }),
      }),
    );
  });

  it("does NOT override explicit _status filter", async () => {
    const adapter = createMockAdapter();
    const resolvers = generateResolvers([draftCollection], adapter);
    const listFn = resolvers.Query.listArticles as (...args: unknown[]) => unknown;
    await listFn({}, { filter: { _status: "draft" }, limit: 10, offset: 0 });
    expect(adapter.findMany).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        where: expect.objectContaining({ _status: "draft" }),
      }),
    );
  });

  it("global query returns {} when record not found", async () => {
    const adapter = createMockAdapter();
    const resolvers = generateResolvers([], adapter, [emptyGlobal]);
    const result = await resolvers.Query.settings();
    expect(result).toEqual({});
  });

  it("global update returns {} when adapter.update returns null", async () => {
    const adapter = createMockAdapter();
    adapter.findOne.mockResolvedValueOnce({ id: "1", siteName: "old" });
    adapter.update.mockResolvedValueOnce(null);
    const resolvers = generateResolvers([], adapter, [emptyGlobal]);
    const result = await resolvers.Mutation.updateSettings({}, { data: { siteName: "new" } });
    expect(result).toEqual({});
  });
});
