import { describe, it, expect } from "vitest";
import type { CollectionDefinition } from "@arche-cms/types";
import type { DatabaseAdapter } from "@arche-cms/database";
import { generateResolvers } from "../src/resolvers.js";

const mockAdapter: DatabaseAdapter = {
  findOne: async () => null,
  findMany: async () => ({ data: [], total: 0 }),
  create: async () => ({}),
  update: async () => null,
  delete: async () => true,
  connect: async () => {},
  disconnect: async () => {},
  transaction: async <T>(fn: () => Promise<T>) => fn(),
  raw: async () => [],
  createTable: async () => {},
  dropTable: async () => {},
  runMigration: async () => {},
  getExecutedMigrations: async () => [],
};

const localizedCollection: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", type: "text", localized: true },
    { name: "body", type: "text" },
  ],
  localization: {
    locales: ["en", "fr"],
    defaultLocale: "en",
  },
};

const userCollection: CollectionDefinition = {
  slug: "users",
  labels: { singular: "User", plural: "Users" },
  fields: [{ name: "name", type: "text" }],
};

const postWithAuthorCollection: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", type: "text" },
    { name: "author", type: "relation", to: "users" },
  ],
};

describe("resolvers — filterLocale with null/undefined data (line 23)", () => {
  it("returns null data as-is when filterLocale receives null", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            id: "1",
            title: null,
            body: "Body",
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
    >[];
    expect(result[0].title).toBeNull();
  });

  it("returns undefined data as-is when filterLocale receives undefined", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => ({
        data: [
          {
            id: "1",
            body: "Body",
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
    >[];
    expect(result[0].title).toBeUndefined();
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
      id: "1",
      title: "Hello",
      author: "nonexistent-user",
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
      id: "1",
      title: "Hello",
      author: "user-42",
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
  slug: "articles",
  labels: { singular: "Article", plural: "Articles" },
  fields: [
    { name: "title", type: "text" },
    { name: "body", type: "text" },
  ],
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
      { data: { title: "Hello", body: "World" } },
    );
    expect(capturedData).toEqual({ title: "Hello", body: "World" });
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
      { id: "1", data: { title: "Updated", body: "Body" } },
    );
    expect(capturedData).toEqual({ title: "Updated", body: "Body" });
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
