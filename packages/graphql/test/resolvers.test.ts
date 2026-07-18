import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import { generateResolvers } from "../src/resolvers.js";

const mockAdapter = {
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
} satisfies DatabaseAdapter;

const postCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "body", type: "richText" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

const userCollection: CollectionDefinition = {
  fields: [{ name: "name", type: "text" }],
  labels: { plural: "Users", singular: "User" },
  slug: "users",
};

const postWithAuthorCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "author", to: "users", type: "relation" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

describe("generateResolvers", () => {
  it("returns Query and Mutation keys", () => {
    const resolvers = generateResolvers([postCollection], mockAdapter);
    expect(resolvers).toHaveProperty("Query");
    expect(resolvers).toHaveProperty("Mutation");
  });

  it("generates list resolver", () => {
    const resolvers = generateResolvers([postCollection], mockAdapter);
    expect(resolvers.Query).toHaveProperty("listPosts");
  });

  it("generates single get resolver", () => {
    const resolvers = generateResolvers([postCollection], mockAdapter);
    expect(resolvers.Query).toHaveProperty("posts");
  });

  it("generates create resolver", () => {
    const resolvers = generateResolvers([postCollection], mockAdapter);
    expect(resolvers.Mutation).toHaveProperty("createPosts");
  });

  it("generates update resolver", () => {
    const resolvers = generateResolvers([postCollection], mockAdapter);
    expect(resolvers.Mutation).toHaveProperty("updatePosts");
  });

  it("generates delete resolver", () => {
    const resolvers = generateResolvers([postCollection], mockAdapter);
    expect(resolvers.Mutation).toHaveProperty("deletePosts");
  });

  it("listPosts resolver calls adapter.findMany", async () => {
    let called = false;
    const adapter = {
      ...mockAdapter,
      findMany: async () => {
        called = true;
        return { data: [], total: 0 };
      },
    };
    const resolvers = generateResolvers([postCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };
    const result = await resolvers.Query.listPosts({}, { limit: 10, offset: 0 });
    expect(called).toBe(true);
    expect(result).toEqual([]);
  });

  it("posts resolver returns null when not found", async () => {
    const resolvers = generateResolvers([postCollection], mockAdapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };
    const result = await resolvers.Query.posts({}, { id: "999" });
    expect(result).toBeNull();
  });

  it("listPosts passes sort arg as QueryOptions.sort", async () => {
    let capturedSort: unknown;
    const adapter = {
      ...mockAdapter,
      findMany: async (_collection: string, options: unknown) => {
        capturedSort = (options as Record<string, unknown>).sort;
        return { data: [], total: 0 };
      },
    };
    const resolvers = generateResolvers([postCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };
    await resolvers.Query.listPosts({}, { sort: "title_desc" });
    expect(capturedSort).toEqual({ title: "desc" });
  });

  it("listPosts passes filter arg as QueryOptions.where", async () => {
    let capturedWhere: unknown;
    const adapter = {
      ...mockAdapter,
      findMany: async (_collection: string, options: unknown) => {
        capturedWhere = (options as Record<string, unknown>).where;
        return { data: [], total: 0 };
      },
    };
    const resolvers = generateResolvers([postCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };
    await resolvers.Query.listPosts({}, { filter: { title: "hello" } });
    expect(capturedWhere).toEqual({ title: "hello" });
  });

  it("createPosts calls adapter.create and returns the row", async () => {
    const created = { body: "Content", id: 1, title: "New Post" };
    const adapter = {
      ...mockAdapter,
      create: async (_collection: string, _data: unknown) => {
        return created;
      },
    };
    const resolvers = generateResolvers([postCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };
    const result = await resolvers.Mutation.createPosts({}, { data: { title: "New Post" } });
    expect(result).toEqual({ body: "Content", id: "1", title: "New Post" });
  });

  it("updatePosts calls adapter.update", async () => {
    const updated = { body: "Content", id: "1", title: "Updated" };
    const adapter = {
      ...mockAdapter,
      update: async () => updated,
    };
    const resolvers = generateResolvers([postCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };
    const result = await resolvers.Mutation.updatePosts(
      {},
      { data: { title: "Updated" }, id: "1" },
    );
    expect(result).toEqual({ body: "Content", id: "1", title: "Updated" });
  });

  it("updatePosts throws on not found", async () => {
    const adapter = {
      ...mockAdapter,
      update: async () => null,
    };
    const resolvers = generateResolvers([postCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };
    await expect(
      resolvers.Mutation.updatePosts({}, { data: { title: "Nope" }, id: "999" }),
    ).rejects.toThrow("Not found");
  });

  it("deletePosts calls adapter.delete and returns boolean", async () => {
    const adapter = {
      ...mockAdapter,
      delete: async () => true,
    };
    const resolvers = generateResolvers([postCollection], adapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };
    const result = await resolvers.Mutation.deletePosts({}, { id: "1" });
    expect(result).toBe(true);
  });

  describe("relation resolution", () => {
    it("creates type-level resolvers for collections with relation fields", () => {
      const resolvers = generateResolvers([userCollection, postWithAuthorCollection], mockAdapter);
      expect(resolvers).toHaveProperty("Posts");
      expect(resolvers.Posts).toHaveProperty("author");
    });

    it("does not create type-level resolvers for collections without relation fields", () => {
      const resolvers = generateResolvers([postCollection], mockAdapter);
      expect(resolvers).not.toHaveProperty("Posts");
    });

    it("resolves a single relation via findOne", async () => {
      const adapter = {
        ...mockAdapter,
        findOne: async (table: string, id: string) => {
          if (table === "__cms_users" && id === "user-1") {
            return { id: "user-1", name: "Alice" };
          }
          return null;
        },
      };
      const resolvers = generateResolvers(
        [userCollection, postWithAuthorCollection],
        adapter,
      ) as Record<string, Record<string, (...args: unknown[]) => unknown>>;
      const result = await resolvers.Posts.author({ author: "user-1", id: "1", title: "Hello" });
      expect(result).toEqual({ id: "user-1", name: "Alice" });
    });

    it("resolves a null relation as null", async () => {
      const resolvers = generateResolvers(
        [userCollection, postWithAuthorCollection],
        mockAdapter,
      ) as Record<string, Record<string, (...args: unknown[]) => unknown>>;
      const result = await resolvers.Posts.author({ author: null, id: "1", title: "Hello" });
      expect(result).toBeNull();
    });

    it("resolves missing target collection without error", () => {
      const orphanCollection: CollectionDefinition = {
        fields: [{ name: "ref", to: "nonexistent", type: "relation" }],
        labels: { plural: "Orphans", singular: "Orphan" },
        slug: "orphans",
      };
      const resolvers = generateResolvers([orphanCollection], mockAdapter);
      expect(resolvers).not.toHaveProperty("Orphans");
    });
  });
});
