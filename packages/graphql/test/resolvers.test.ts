import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition, GlobalDefinition } from "@arche-cms/types";

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

  it("listPosts resolver returns connection object", async () => {
    const adapter = {
      ...mockAdapter,
      findMany: async () => {
        return { data: [{ id: 1, title: "Hello" }], total: 1 };
      },
    };
    const resolvers = generateResolvers([postCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };
    const result = (await resolvers.Query.listPosts({}, { limit: 10, offset: 0 })) as Record<
      string,
      unknown
    >;
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total", 1);
    expect(result).toHaveProperty("limit", 10);
    expect(result).toHaveProperty("offset", 0);
    expect(result.data).toEqual([{ id: "1", title: "Hello" }]);
  });

  it("listPosts caps limit at 100", async () => {
    let capturedLimit: unknown;
    const adapter = {
      ...mockAdapter,
      findMany: async (_col: string, opts: unknown) => {
        capturedLimit = (opts as Record<string, unknown>).limit;
        return { data: [], total: 0 };
      },
    };
    const resolvers = generateResolvers([postCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };
    await resolvers.Query.listPosts({}, { limit: 500, offset: 0 });
    expect(capturedLimit).toBe(100);
  });

  it("listPosts defaults to limit=10 offset=0", async () => {
    let capturedOpts: unknown;
    const adapter = {
      ...mockAdapter,
      findMany: async (_col: string, opts: unknown) => {
        capturedOpts = opts;
        return { data: [], total: 0 };
      },
    };
    const resolvers = generateResolvers([postCollection], adapter) as {
      Query: Record<string, (...args: unknown[]) => unknown>;
    };
    await resolvers.Query.listPosts({}, {});
    expect(capturedOpts).toEqual({ limit: 10, offset: 0 });
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

  it("createPosts rejects invalid data via safeParse", async () => {
    const col: CollectionDefinition = {
      fields: [{ name: "title", type: "text", validation: { required: true } }],
      labels: { plural: "Items", singular: "Item" },
      slug: "items",
    };
    const resolvers = generateResolvers([col], mockAdapter) as {
      Mutation: Record<string, (...args: unknown[]) => unknown>;
    };
    await expect(resolvers.Mutation.createItems({}, { data: {} })).rejects.toThrow(
      "Validation failed",
    );
  });

  describe("draft and soft-delete awareness", () => {
    it("listPosts filters by _status=published when drafts enabled", async () => {
      let capturedWhere: unknown;
      const col: CollectionDefinition = {
        fields: [{ name: "title", type: "text" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
        versions: { drafts: true },
      };
      const adapter = {
        ...mockAdapter,
        findMany: async (_c: string, opts: unknown) => {
          capturedWhere = (opts as Record<string, unknown>).where;
          return { data: [], total: 0 };
        },
      };
      const resolvers = generateResolvers([col], adapter) as {
        Query: Record<string, (...args: unknown[]) => unknown>;
      };
      await resolvers.Query.listPosts({}, {});
      expect(capturedWhere).toEqual({ _status: "published" });
    });

    it("listPosts filters by _deletedAt=null when softDelete enabled", async () => {
      let capturedWhere: unknown;
      const col: CollectionDefinition = {
        fields: [{ name: "title", type: "text" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
        versions: { drafts: false, softDelete: true },
      };
      const adapter = {
        ...mockAdapter,
        findMany: async (_c: string, opts: unknown) => {
          capturedWhere = (opts as Record<string, unknown>).where;
          return { data: [], total: 0 };
        },
      };
      const resolvers = generateResolvers([col], adapter) as {
        Query: Record<string, (...args: unknown[]) => unknown>;
      };
      await resolvers.Query.listPosts({}, {});
      expect(capturedWhere).toEqual({ _deletedAt: null });
    });
  });

  describe("globals", () => {
    const siteSettings: GlobalDefinition = {
      fields: [
        { name: "title", type: "text" },
        { name: "description", type: "textarea" },
      ],
      label: "Site Settings",
      slug: "siteSettings",
    };

    it("generates query resolver for global", () => {
      const resolvers = generateResolvers([postCollection], mockAdapter, [siteSettings]);
      expect(resolvers.Query).toHaveProperty("siteSettings");
    });

    it("generates mutation resolver for global", () => {
      const resolvers = generateResolvers([postCollection], mockAdapter, [siteSettings]);
      expect(resolvers.Mutation).toHaveProperty("updateSiteSettings");
    });

    it("global query calls adapter.findOne", async () => {
      let calledWith: unknown;
      const adapter = {
        ...mockAdapter,
        findOne: async (table: string, id: string) => {
          calledWith = { id, table };
          return { title: "My Site" };
        },
      };
      const resolvers = generateResolvers([postCollection], adapter, [siteSettings]) as Record<
        string,
        Record<string, (...args: unknown[]) => unknown>
      >;
      const result = await resolvers.Query.siteSettings();
      expect(calledWith).toEqual({ id: "1", table: "__cms_siteSettings" });
      expect(result).toEqual({ title: "My Site" });
    });

    it("global update calls adapter.create when no existing record", async () => {
      let calledWith: unknown;
      const adapter = {
        ...mockAdapter,
        create: async (table: string, data: unknown) => {
          calledWith = { data, table };
          return data;
        },
        findOne: async () => null,
      };
      const resolvers = generateResolvers([postCollection], adapter, [siteSettings]) as Record<
        string,
        Record<string, (...args: unknown[]) => unknown>
      >;
      await resolvers.Mutation.updateSiteSettings({}, { data: { title: "Updated" } });
      expect(calledWith).toEqual({
        data: { id: 1, title: "Updated" },
        table: "__cms_siteSettings",
      });
    });

    it("global update calls adapter.update when existing record", async () => {
      let calledWith: unknown;
      const adapter = {
        ...mockAdapter,
        findOne: async () => ({ title: "Old" }),
        update: async (_table: string, id: string, data: unknown) => {
          calledWith = { data, id };
          return data;
        },
      };
      const resolvers = generateResolvers([postCollection], adapter, [siteSettings]) as Record<
        string,
        Record<string, (...args: unknown[]) => unknown>
      >;
      await resolvers.Mutation.updateSiteSettings({}, { data: { title: "Updated" } });
      expect(calledWith).toEqual({ data: { title: "Updated" }, id: "1" });
    });
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
