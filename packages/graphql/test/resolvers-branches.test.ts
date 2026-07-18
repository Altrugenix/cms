import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import { generateResolvers } from "../src/resolvers.js";

const mockAdapter: DatabaseAdapter = {
  connect: async () => {},
  create: async () => ({}),
  createTable: async () => {},
  delete: async () => true,
  disconnect: async () => {},
  dropTable: async () => {},
  findMany: async () => ({ data: [], total: 0 }),
  findOne: async () => null,
  getExecutedMigrations: async () => [],
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

const userCollection: CollectionDefinition = {
  fields: [{ name: "name", type: "text" }],
  labels: { plural: "Users", singular: "User" },
  slug: "users",
};

const postWithAuthorCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text" },
    { name: "author", to: "users", type: "relation" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

describe("resolvers — filterLocale with null/undefined data (line 23)", () => {
  it("returns null data as-is when filterLocale receives null", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            body: "Body",
            id: "1",
            title: null,
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
    expect(data[0].title).toBeNull();
  });

  it("returns undefined data as-is when filterLocale receives undefined", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            body: "Body",
            id: "1",
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
    expect(data[0].title).toBeUndefined();
  });
});

describe("resolvers — single relation where findOne returns null (line 89)", () => {
  it("returns null when relation ID exists but target record not found", async () => {
    const adapter = {
      ...mockAdapter,
      findOne: async () => null,
    };

    const resolvers = generateResolvers(
      [userCollection, postWithAuthorCollection],
      adapter,
    ) as Record<string, Record<string, (...args: unknown[]) => unknown>>;

    const result = await resolvers.Posts.author({
      author: "nonexistent-user",
      id: "1",
      title: "Hello",
    });
    expect(result).toBeNull();
  });

  it("returns the record when relation ID exists and target found", async () => {
    const adapter = {
      ...mockAdapter,
      findOne: async (table: string, id: string) => {
        if (table === "__cms_users" && id === "user-42") {
          return { id: 42, name: "Bob" };
        }
        return null;
      },
    };

    const resolvers = generateResolvers(
      [userCollection, postWithAuthorCollection],
      adapter,
    ) as Record<string, Record<string, (...args: unknown[]) => unknown>>;

    const result = await resolvers.Posts.author({
      author: "user-42",
      id: "1",
      title: "Hello",
    });
    expect(result).toEqual({ id: "42", name: "Bob" });
  });
});

describe("resolvers — sort with asc direction (line 129)", () => {
  it("sorts ascending when sort string ends with _asc", async () => {
    let capturedSort: unknown;
    const adapter = {
      ...mockAdapter,
      findMany: async (_table: string, options?: unknown) => {
        capturedSort = (options as Record<string, unknown>).sort;
        return { data: [], total: 0 };
      },
    };

    const resolvers = generateResolvers([localizedCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };

    await resolvers.Query.listPosts({}, { sort: "title_asc" });
    expect(capturedSort).toEqual({ title: "asc" });
  });
});

const simpleCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text" },
    { name: "body", type: "text" },
  ],
  labels: { plural: "Articles", singular: "Article" },
  slug: "articles",
};

describe("resolvers — create/update mutation with null data (lines 166, 176)", () => {
  it("createMutation handles data that parses to an object", async () => {
    let capturedData: unknown;
    const adapter = {
      ...mockAdapter,
      create: async (_table: string, data: unknown) => {
        capturedData = data;
        return { id: "1", ...(data as Record<string, unknown>) };
      },
    };

    const resolvers = generateResolvers([simpleCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = await resolvers.Mutation.createArticles(
      {},
      { data: { body: "World", title: "Hello" } },
    );
    expect(capturedData).toEqual({ body: "World", title: "Hello" });
    expect(result).toHaveProperty("id");
  });

  it("updateMutation handles data that parses to an object", async () => {
    let capturedData: unknown;
    const adapter = {
      ...mockAdapter,
      update: async (_table: string, _id: string, data: unknown) => {
        capturedData = data;
        return { id: "1", ...(data as Record<string, unknown>) };
      },
    };

    const resolvers = generateResolvers([simpleCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = await resolvers.Mutation.updateArticles(
      {},
      { data: { body: "Body", title: "Updated" }, id: "1" },
    );
    expect(capturedData).toEqual({ body: "Body", title: "Updated" });
    expect(result).toHaveProperty("id");
  });

  it("createMutation with empty data object", async () => {
    const adapter = {
      ...mockAdapter,
      create: async (_table: string, data: unknown) => {
        return { id: "1", ...(data as Record<string, unknown>) };
      },
    };

    const resolvers = generateResolvers([simpleCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };

    const result = await resolvers.Mutation.createArticles({}, { data: {} });
    expect(result).toEqual({ id: "1" });
  });
});
