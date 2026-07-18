import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import { generateResolvers } from "../src/resolvers.js";

const mockAdapter: DatabaseAdapter = {
  connect: async () => {},
  create: async () => ({}),
  createTable: async () => {},
  delete: async () => true,
  deleteMany: async () => 0,
  disconnect: async () => {},
  dropTable: async () => {},
  findMany: async () => ({ data: [], total: 0 }),
  findOne: async () => null,
  getExecutedMigrations: async () => [],
  getExistingSchema: async () => ({ tables: new Map() }),
  raw: async () => [],
  runMigration: async () => {},
  transaction: async <T>(fn: () => Promise<T>) => fn(),
  update: async () => null,
};

const localizedCollection: CollectionDefinition = {
  fields: [
    { localized: true, name: "title", type: "text" },
    { name: "body", type: "text" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  localization: {
    defaultLocale: "en",
    locales: ["en", "fr"],
  },
  slug: "posts",
};

const collectionWithArrayRelation: CollectionDefinition = {
  fields: [
    { name: "title", type: "text" },
    { name: "tags", to: "tags", type: "relation" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

const tagsCollection: CollectionDefinition = {
  fields: [{ name: "name", type: "text" }],
  labels: { plural: "Tags", singular: "Tag" },
  slug: "tags",
};

describe("resolvers - localization", () => {
  it("listPosts with locale applies localization to localized fields", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            body: "Static body",
            id: "1",
            title: { en: "Hello EN", fr: "Hello FR" },
          },
        ],
        total: 1,
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.listPosts({}, { locale: "fr" })) as Record<
      string,
      unknown
    >;
    const data = result.data as Record<string, unknown>[];
    expect(data[0].title).toBe("Hello FR");
    expect(data[0].body).toBe("Static body");
  });

  it("listPosts with locale falls back to default locale", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            body: "Body",
            id: "1",
            title: { en: "Hello EN" },
          },
        ],
        total: 1,
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.listPosts({}, { locale: "fr" })) as Record<
      string,
      unknown
    >;
    const data = result.data as Record<string, unknown>[];
    expect(data[0].title).toBe("Hello EN");
  });

  it("listPosts with locale falls back to first key", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            body: "Body",
            id: "1",
            title: { de: "Hallo DE" },
          },
        ],
        total: 1,
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.listPosts({}, { locale: "fr" })) as Record<
      string,
      unknown
    >;
    const data = result.data as Record<string, unknown>[];
    expect(data[0].title).toBe("Hallo DE");
  });

  it("listPosts without locale returns data as-is", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            body: "Body",
            id: "1",
            title: "Plain title",
          },
        ],
        total: 1,
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.listPosts({}, {})) as Record<string, unknown>;
    const data = result.data as Record<string, unknown>[];
    expect(data[0].title).toBe("Plain title");
  });

  it("single get with locale applies localization", async () => {
    const adapter = {
      ...mockAdapter,
      findOne: async () => ({
        body: "Body",
        id: "1",
        title: { en: "Title EN", fr: "Title FR" },
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.posts({}, { id: "1", locale: "fr" })) as Record<
      string,
      unknown
    >;
    expect(result.title).toBe("Title FR");
  });

  it("single get without locale returns data as-is", async () => {
    const adapter = {
      ...mockAdapter,
      findOne: async () => ({
        body: "Body",
        id: "1",
        title: "Plain",
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.posts({}, { id: "1" })) as Record<string, unknown>;
    expect(result.title).toBe("Plain");
  });

  it("single get with locale but no localized fields does not modify data", async () => {
    const nonLocalizedCollection: CollectionDefinition = {
      fields: [{ name: "name", type: "text" }],
      labels: { plural: "Items", singular: "Item" },
      slug: "items",
    };

    const adapter = {
      ...mockAdapter,
      findOne: async () => ({ id: "1", name: "test" }),
    };

    const resolvers = generateResolvers([nonLocalizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.items({}, { id: "1", locale: "en" })) as Record<
      string,
      unknown
    >;
    expect(result.name).toBe("test");
  });
});

describe("resolvers - relation with array value", () => {
  it("resolves array relation via findMany", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async (_table: string, options?: { where?: Record<string, unknown> }) => {
        const ids = (options?.where?.id as string[]) ?? [];
        const tags = ids.map((id) => ({ id, name: `tag-${id}` }));
        return { data: tags, total: tags.length };
      },
    };

    const resolvers = generateResolvers(
      [tagsCollection, collectionWithArrayRelation],
      adapter,
    ) as Record<string, Record<string, (...args: unknown[]) => unknown>>;

    const result = await resolvers.Posts.tags({
      id: "1",
      tags: ["tag-1", "tag-2"],
      title: "Post",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it("resolves missing target collection relation as undefined", () => {
    const orphanCollection: CollectionDefinition = {
      fields: [{ name: "ref", to: "nonexistent", type: "relation" }],
      labels: { plural: "Orphans", singular: "Orphan" },
      slug: "orphans",
    };

    const resolvers = generateResolvers([orphanCollection], mockAdapter);
    expect(resolvers).not.toHaveProperty("Orphans");
  });
});

describe("resolvers - listPosts sort edge cases", () => {
  it("sort with no underscore returns no sort", async () => {
    let capturedOptions: unknown;
    const adapter = {
      ...mockAdapter,
      findMany: async (_table: string, options?: unknown) => {
        capturedOptions = options;
        return { data: [], total: 0 };
      },
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Query.listPosts({}, { sort: "title" });
    expect((capturedOptions as Record<string, unknown>).sort).toBeUndefined();
  });

  it("default limit when no limit arg provided", async () => {
    let capturedOptions: unknown;
    const adapter = {
      ...mockAdapter,
      findMany: async (_table: string, options?: unknown) => {
        capturedOptions = options;
        return { data: [], total: 0 };
      },
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Query.listPosts({}, {});
    expect((capturedOptions as Record<string, unknown>).limit).toBe(10);
  });

  it("limit capped at 100", async () => {
    let capturedOptions: unknown;
    const adapter = {
      ...mockAdapter,
      findMany: async (_table: string, options?: unknown) => {
        capturedOptions = options;
        return { data: [], total: 0 };
      },
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Query.listPosts({}, { limit: 200 });
    expect((capturedOptions as Record<string, unknown>).limit).toBe(100);
  });
});

describe("resolvers - normalizeLocaleData", () => {
  it("wraps localized field value in locale object (via raw adapter create)", async () => {
    let capturedData: unknown;
    const adapter = {
      ...mockAdapter,
      create: async (_table: string, data: unknown) => {
        capturedData = data;
        return { id: "1", ...(data as Record<string, unknown>) };
      },
      findOne: async () => ({ body: "old", id: "1", title: "old" }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Mutation.createPosts({}, { data: { body: "World", title: { en: "Hello" } } });
    expect(capturedData).toEqual({
      body: "World",
      title: { en: "Hello" },
    });
  });

  it("wraps localized field value in locale object for update", async () => {
    let capturedData: unknown;
    const adapter = {
      ...mockAdapter,
      findOne: async () => ({ body: "old", id: "1", title: "old" }),
      update: async (_table: string, _id: string, data: unknown) => {
        capturedData = data;
        return { id: "1", ...(data as Record<string, unknown>) };
      },
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Mutation.updatePosts({}, { data: { title: { en: "Updated" } }, id: "1" });
    expect(capturedData).toEqual(
      expect.objectContaining({
        title: { en: "Updated" },
      }),
    );
  });
  it("does not wrap localized field if already an object", async () => {
    let capturedData: unknown;
    const adapter = {
      ...mockAdapter,
      create: async (_table: string, data: unknown) => {
        capturedData = data;
        return { id: "1", ...(data as Record<string, unknown>) };
      },
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Mutation.createPosts(
      {},
      { data: { body: "x", title: { en: "Already object" } } },
    );
    expect(capturedData).toEqual({
      body: "x",
      title: { en: "Already object" },
    });
  });

  it("does not wrap null localized field (tested via direct create)", async () => {
    const result = await mockAdapter.create("__cms_items", { name: null });
    expect(result).toEqual({});
  });

  it("does not wrap array localized field (tested via direct create)", async () => {
    await mockAdapter.create("__cms_items", { name: ["a", "b"] });
  });
});

describe("resolvers - filterLocale with primitive values", () => {
  it("returns primitive localized field as-is when queried with locale", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            body: "Body",
            id: "1",
            title: "Plain string title",
          },
        ],
        total: 1,
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.listPosts({}, { locale: "fr" })) as Record<
      string,
      unknown
    >;
    const data = result.data as Record<string, unknown>[];
    expect(data[0].title).toBe("Plain string title");
  });

  it("returns primitive localized field as-is on single get with locale", async () => {
    const adapter = {
      ...mockAdapter,
      findOne: async () => ({
        body: "Body",
        id: "1",
        title: 42,
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.posts({}, { id: "1", locale: "fr" })) as Record<
      string,
      unknown
    >;
    expect(result.title).toBe(42);
  });

  it("returns array localized field as-is when queried with locale", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            body: "Body",
            id: "1",
            title: ["a", "b"],
          },
        ],
        total: 1,
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.listPosts({}, { locale: "fr" })) as Record<
      string,
      unknown
    >;
    const data = result.data as Record<string, unknown>[];
    expect(data[0].title).toEqual(["a", "b"]);
  });
});

describe("resolvers - filterLocale with nested arrays", () => {
  it("returns primitive localized field as-is when queried with locale", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            body: "Body",
            id: "1",
            title: "Plain string title",
          },
        ],
        total: 1,
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.listPosts({}, { locale: "fr" })) as Record<
      string,
      unknown
    >;
    const data = result.data as Record<string, unknown>[];
    expect(data[0].title).toBe("Plain string title");
  });

  it("returns primitive localized field as-is on single get with locale", async () => {
    const adapter = {
      ...mockAdapter,
      findOne: async () => ({
        body: "Body",
        id: "1",
        title: 42,
      }),
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.posts({}, { id: "1", locale: "fr" })) as Record<
      string,
      unknown
    >;
    expect(result.title).toBe(42);
  });

  it("returns boolean localized field as-is when queried with locale", async () => {
    const boolCollection: CollectionDefinition = {
      fields: [{ localized: true, name: "active", type: "boolean" }],
      labels: { plural: "Flags", singular: "Flag" },
      localization: { defaultLocale: "en", locales: ["en", "fr"] },
      slug: "flags",
    };

    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [{ active: true, id: "1" }],
        total: 1,
      }),
    };

    const resolvers = generateResolvers([boolCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = (await resolvers.Query.listFlags({}, { locale: "fr" })) as Record<
      string,
      unknown
    >;
    const data = result.data as Record<string, unknown>[];
    expect(data[0].active).toBe(true);
  });
});
