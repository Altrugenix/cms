import type { CollectionDefinition, DatabaseAdapter, QueryOptions } from "@arche-cms/database";

import { describe, it, expect } from "vitest";

import {
  createListHandler,
  createGetHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler,
  createBulkDeleteHandler,
} from "../src/handlers.js";

const posts: Record<string, unknown>[] = [
  { author: "user-1", body: "World", id: 1, title: "Hello" },
  { author: "user-2", body: "Post", id: 2, title: "Second" },
];

const users: Record<string, unknown>[] = [
  { id: "user-1", name: "Alice" },
  { id: "user-2", name: "Bob" },
];

function createMockAdapter(): DatabaseAdapter {
  let nextId = 3;
  const store = posts.map((p) => ({ ...p }));
  const userStore = users.map((u) => ({ ...u }));

  return {
    connect: async () => {},
    create: async (_collection: string, data: Record<string, unknown>) => {
      const record = { id: nextId++, ...data };
      store.push(record);
      return record;
    },
    createTable: async () => {},
    delete: async (_collection: string, id: string) => {
      const idx = store.findIndex((p) => String(p.id) === id);
      if (idx === -1) return false;
      store.splice(idx, 1);
      return true;
    },
    deleteMany: async (_collection: string, ids: string[]) => {
      let count = 0;
      for (const id of ids) {
        const idx = store.findIndex((p) => String(p.id) === id);
        if (idx !== -1) {
          store.splice(idx, 1);
          count++;
        }
      }
      return count;
    },
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (collection: string, options?: QueryOptions) => {
      let data = collection === "__cms_users" ? [...userStore] : [...store];
      if (options?.where) {
        const entries = Object.entries(options.where);
        for (const [key, value] of entries) {
          if (Array.isArray(value)) {
            data = data.filter((r) => value.includes(String(r[key])));
          } else {
            data = data.filter((r) => r[key] === value);
          }
        }
      }
      const total = data.length;
      if (options?.sort) {
        for (const [field, dir] of Object.entries(options.sort)) {
          data.sort((a, b) => {
            const va = String(a[field] ?? "");
            const vb = String(b[field] ?? "");
            return dir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
          });
        }
      }
      if (options?.offset) data = data.slice(options.offset);
      if (options?.limit) data = data.slice(0, options.limit);
      const selectFields = options?.select as string[] | undefined;
      if (selectFields) {
        data = data.map((r) => {
          const selected: Record<string, unknown> = {};
          for (const field of selectFields) {
            if (field in r) selected[field] = r[field];
          }
          return selected;
        });
      }
      return { data, total };
    },
    findOne: async (collection: string, id: string, options?: QueryOptions) => {
      if (collection === "__cms_users") {
        return users.find((u) => u.id === id) ?? null;
      }
      const record = store.find((p) => String(p.id) === id);
      if (record && options?.select) {
        const selected: Record<string, unknown> = {};
        for (const field of options.select) {
          if (field in record) selected[field] = record[field];
        }
        return Object.keys(selected).length > 0 ? selected : record;
      }
      return record ?? null;
    },
    getExecutedMigrations: async () => [],
    raw: async () => [],
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async (_collection: string, id: string, data: Record<string, unknown>) => {
      const idx = store.findIndex((p) => String(p.id) === id);
      if (idx === -1) return null;
      store[idx] = { ...store[idx], ...data };
      return store[idx] as Record<string, unknown>;
    },
  };
}

const collection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "body", type: "richText" },
    { name: "author", to: "users", type: "relation" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

describe("CRUD handlers", () => {
  it("listHandler returns paginated results", async () => {
    const adapter = createMockAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({
      body: null,
      headers: {},
      params: {},
      query: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as { data: unknown[]; total: number };
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("listHandler respects limit and offset", async () => {
    const adapter = createMockAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({
      body: null,
      headers: {},
      params: {},
      query: { limit: "1", offset: "1" },
    });
    const body = result.body as { data: unknown[]; total: number };
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(2);
  });

  it("listHandler respects sort", async () => {
    const adapter = createMockAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({
      body: null,
      headers: {},
      params: {},
      query: { sort: "title:desc" },
    });
    const body = result.body as { data: { title: string }[] };
    expect((body.data[0] as { title: string }).title).toBe("Second");
  });

  it("listHandler respects field selection", async () => {
    const adapter = createMockAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({
      body: null,
      headers: {},
      params: {},
      query: { select: "title" },
    });
    const body = result.body as { data: Record<string, unknown>[] };
    expect(body.data[0]).toEqual({ title: "Hello" });
  });

  it("listHandler respects where filter", async () => {
    const adapter = createMockAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({
      body: null,
      headers: {},
      params: {},
      query: { "where[title]": "Hello" },
    });
    const body = result.body as { data: unknown[]; total: number };
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("listHandler populates relations", async () => {
    const adapter = createMockAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({
      body: null,
      headers: {},
      params: {},
      query: { populate: "author" },
    });
    const body = result.body as { data: Record<string, unknown>[] };
    expect((body.data[0] as Record<string, unknown>).author).toEqual({
      id: "user-1",
      name: "Alice",
    });
  });

  it("getHandler returns a single record", async () => {
    const adapter = createMockAdapter();
    const handler = createGetHandler(collection, adapter);
    const result = await handler({
      body: null,
      headers: {},
      params: { id: "1" },
      query: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.title).toBe("Hello");
  });

  it("getHandler returns 404 for missing record", async () => {
    const adapter = createMockAdapter();
    const handler = createGetHandler(collection, adapter);
    const result = await handler({
      body: null,
      headers: {},
      params: { id: "999" },
      query: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("getHandler applies field selection", async () => {
    const adapter = createMockAdapter();
    const handler = createGetHandler(collection, adapter);
    const result = await handler({
      body: null,
      headers: {},
      params: { id: "1" },
      query: { select: "title" },
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.title).toBe("Hello");
  });

  it("getHandler returns 400 for missing id", async () => {
    const adapter = createMockAdapter();
    const handler = createGetHandler(collection, adapter);
    const result = await handler({
      body: null,
      headers: {},
      params: {},
      query: {},
    });
    expect(result.statusCode).toBe(400);
  });

  it("getHandler populates relations", async () => {
    const adapter = createMockAdapter();
    const handler = createGetHandler(collection, adapter);
    const result = await handler({
      body: null,
      headers: {},
      params: { id: "1" },
      query: { populate: "author" },
    });
    const body = result.body as Record<string, unknown>;
    expect(body.author).toEqual({ id: "user-1", name: "Alice" });
  });

  it("getHandler populates array relations", async () => {
    const adapter = createMockAdapter();
    (adapter as Record<string, unknown>).__store = [
      { categories: ["cat-1", "cat-2"], id: 1, title: "Hello" },
    ];
    const collectionWithArrayRelation: CollectionDefinition = {
      fields: [
        { name: "title", type: "text" },
        { name: "categories", to: "tags", type: "relation" },
      ],
      labels: { plural: "Posts", singular: "Post" },
      slug: "custom-posts",
    };
    const handler = createGetHandler(collectionWithArrayRelation, adapter);
    const result = await handler({
      body: null,
      headers: {},
      params: { id: "1" },
      query: { populate: "categories" },
    });
    expect(result.statusCode).toBe(200);
  });

  it("createHandler creates a record", async () => {
    const adapter = createMockAdapter();
    const handler = createCreateHandler(collection, adapter);
    const result = await handler({
      body: { body: "Content", title: "New Post" },
      headers: {},
      params: {},
      query: {},
    });
    expect(result.statusCode).toBe(201);
    const body = result.body as Record<string, unknown>;
    expect(body.title).toBe("New Post");
    expect(body.id).toBe(3);
  });

  it("createHandler returns 400 for missing body", async () => {
    const adapter = createMockAdapter();
    const handler = createCreateHandler(collection, adapter);
    const result = await handler({
      body: null,
      headers: {},
      params: {},
      query: {},
    });
    expect(result.statusCode).toBe(400);
  });

  it("createHandler returns 400 for validation failure", async () => {
    const adapter = createMockAdapter();
    const handler = createCreateHandler(collection, adapter);
    const result = await handler({
      body: { body: "Content without title" },
      headers: {},
      params: {},
      query: {},
    });
    expect(result.statusCode).toBe(400);
    const body = result.body as Record<string, unknown>;
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("updateHandler updates a record", async () => {
    const adapter = createMockAdapter();
    const handler = createUpdateHandler(collection, adapter);
    const result = await handler({
      body: { title: "Updated" },
      headers: {},
      params: { id: "1" },
      query: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.title).toBe("Updated");
  });

  it("updateHandler returns 404 for missing record", async () => {
    const adapter = createMockAdapter();
    const handler = createUpdateHandler(collection, adapter);
    const result = await handler({
      body: { title: "Nope" },
      headers: {},
      params: { id: "999" },
      query: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("deleteHandler deletes a record", async () => {
    const adapter = createMockAdapter();
    const handler = createDeleteHandler(collection, adapter);
    const result = await handler({
      body: null,
      headers: {},
      params: { id: "1" },
      query: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.deleted).toBe(true);
  });

  it("deleteHandler returns 404 for missing record", async () => {
    const adapter = createMockAdapter();
    const handler = createDeleteHandler(collection, adapter);
    const result = await handler({
      body: null,
      headers: {},
      params: { id: "999" },
      query: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("bulkDeleteHandler deletes multiple records", async () => {
    const adapter = createMockAdapter();
    const handler = createBulkDeleteHandler(collection, adapter);
    const result = await handler({
      body: { ids: ["1", "2"] },
      headers: {},
      params: {},
      query: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as { deleted: number };
    expect(body.deleted).toBe(2);
  });

  it("bulkDeleteHandler returns 400 for missing ids", async () => {
    const adapter = createMockAdapter();
    const handler = createBulkDeleteHandler(collection, adapter);
    const result = await handler({
      body: {},
      headers: {},
      params: {},
      query: {},
    });
    expect(result.statusCode).toBe(400);
  });

  it("bulkDeleteHandler returns 400 for empty ids array", async () => {
    const adapter = createMockAdapter();
    const handler = createBulkDeleteHandler(collection, adapter);
    const result = await handler({
      body: { ids: [] },
      headers: {},
      params: {},
      query: {},
    });
    expect(result.statusCode).toBe(400);
  });
});

describe("array relation populate", () => {
  it("collectRelationIds handles array values", async () => {
    const store: Record<string, unknown>[] = [{ id: 1, tags: ["tag-1", "tag-2"], title: "Post A" }];
    const tagsStore: Record<string, unknown>[] = [
      { id: "tag-1", name: "Tech" },
      { id: "tag-2", name: "Science" },
    ];
    const adapter: DatabaseAdapter = {
      connect: async () => {},
      create: async (_, d) => {
        const r = { id: store.length + 1, ...d };
        store.push(r);
        return r;
      },
      createTable: async () => {},
      delete: async () => false,
      deleteMany: async () => 0,
      disconnect: async () => {},
      dropTable: async () => {},
      findMany: async (_c, opts) => {
        if (_c === "__cms_tags") {
          if (opts?.where?.id) {
            const ids = opts.where.id as string[];
            return { data: tagsStore.filter((t) => ids.includes(String(t.id))), total: 0 };
          }
          return { data: tagsStore, total: tagsStore.length };
        }
        let data = [...store];
        if (opts?.where) {
          for (const [key, value] of Object.entries(opts.where)) {
            if (Array.isArray(value)) {
              data = data.filter((r) => value.includes(String(r[key])));
            } else {
              data = data.filter((r) => r[key] === value);
            }
          }
        }
        return { data, total: data.length };
      },
      findOne: async (_c, id) => {
        if (_c === "__cms_tags") return tagsStore.find((t) => t.id === id) ?? null;
        return store.find((s) => String(s.id) === id) ?? null;
      },
      getExecutedMigrations: async () => [],
      raw: async () => [],
      runMigration: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      update: async (_, id, d) => {
        const i = store.findIndex((r) => String(r.id) === id);
        if (i === -1) return null;
        store[i] = { ...store[i], ...d };
        return store[i];
      },
    };
    const collectionWithArrayRel: CollectionDefinition = {
      fields: [
        { name: "title", type: "text" },
        { name: "tags", to: "tags", type: "relation" },
      ],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const handler = createGetHandler(collectionWithArrayRel, adapter);
    const result = await handler({
      body: null,
      headers: {},
      params: { id: "1" },
      query: { populate: "tags" },
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.tags).toEqual([
      { id: "tag-1", name: "Tech" },
      { id: "tag-2", name: "Science" },
    ]);
  });

  it("collectRelationIds handles mixed array and non-array values", async () => {
    const store: Record<string, unknown>[] = [
      { id: 1, tags: ["tag-1", "tag-2"], title: "Post A" },
      { id: 2, tags: "tag-1", title: "Post B" },
    ];
    const tagsStore: Record<string, unknown>[] = [
      { id: "tag-1", name: "Tech" },
      { id: "tag-2", name: "Science" },
    ];
    const adapter: DatabaseAdapter = {
      connect: async () => {},
      create: async (_, d) => {
        const r = { id: store.length + 1, ...d };
        store.push(r);
        return r;
      },
      createTable: async () => {},
      delete: async () => false,
      deleteMany: async () => 0,
      disconnect: async () => {},
      dropTable: async () => {},
      findMany: async (_c, opts) => {
        if (_c === "__cms_tags") {
          if (opts?.where?.id) {
            const ids = opts.where.id as string[];
            return { data: tagsStore.filter((t) => ids.includes(String(t.id))), total: 0 };
          }
          return { data: tagsStore, total: tagsStore.length };
        }
        let data = [...store];
        if (opts?.where) {
          for (const [key, value] of Object.entries(opts.where)) {
            if (Array.isArray(value)) {
              data = data.filter((r) => value.includes(String(r[key])));
            } else {
              data = data.filter((r) => r[key] === value);
            }
          }
        }
        return { data, total: data.length };
      },
      findOne: async (_c, id) => {
        if (_c === "__cms_tags") return tagsStore.find((t) => t.id === id) ?? null;
        return store.find((s) => String(s.id) === id) ?? null;
      },
      getExecutedMigrations: async () => [],
      raw: async () => [],
      runMigration: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      update: async (_, id, d) => {
        const i = store.findIndex((r) => String(r.id) === id);
        if (i === -1) return null;
        store[i] = { ...store[i], ...d };
        return store[i];
      },
    };
    const collectionWithArrayRel: CollectionDefinition = {
      fields: [
        { name: "title", type: "text" },
        { name: "tags", to: "tags", type: "relation" },
      ],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const handler = createListHandler(collectionWithArrayRel, adapter, 100, 10);
    const result = await handler({
      body: null,
      headers: {},
      params: {},
      query: { populate: "tags" },
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as { data: Record<string, unknown>[] };
    expect(body.data[0].tags).toEqual([
      { id: "tag-1", name: "Tech" },
      { id: "tag-2", name: "Science" },
    ]);
    expect(body.data[1].tags).toEqual({ id: "tag-1", name: "Tech" });
  });

  it("collectRelationIds handles null value", async () => {
    const store: Record<string, unknown>[] = [
      null as unknown as Record<string, unknown>,
      { id: 2, tags: "tag-1", title: "Post B" },
    ];
    const tagsStore: Record<string, unknown>[] = [{ id: "tag-1", name: "Tech" }];
    const adapter: DatabaseAdapter = {
      connect: async () => {},
      create: async (_, d) => {
        const r = { id: store.length + 1, ...d };
        store.push(r);
        return r;
      },
      createTable: async () => {},
      delete: async () => false,
      deleteMany: async () => 0,
      disconnect: async () => {},
      dropTable: async () => {},
      findMany: async (_c, opts) => {
        if (_c === "__cms_tags") {
          if (opts?.where?.id) {
            const ids = opts.where.id as string[];
            return { data: tagsStore.filter((t) => ids.includes(String(t.id))), total: 0 };
          }
          return { data: tagsStore, total: tagsStore.length };
        }
        let data = [...store.filter(Boolean)];
        if (opts?.where) {
          for (const [key, value] of Object.entries(opts.where)) {
            if (Array.isArray(value)) {
              data = data.filter((r) => value.includes(String(r[key])));
            } else {
              data = data.filter((r) => r[key] === value);
            }
          }
        }
        return { data, total: data.length };
      },
      findOne: async (_c, id) => {
        if (_c === "__cms_tags") return tagsStore.find((t) => t.id === id) ?? null;
        return store.find((s) => s && String(s.id) === id) ?? null;
      },
      getExecutedMigrations: async () => [],
      raw: async () => [],
      runMigration: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      update: async (_, id, d) => {
        const i = store.findIndex((r) => r && String(r.id) === id);
        if (i === -1) return null;
        store[i] = { ...store[i], ...d };
        return store[i];
      },
    };
    const collectionWithArrayRel: CollectionDefinition = {
      fields: [
        { name: "title", type: "text" },
        { name: "tags", to: "tags", type: "relation" },
      ],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const handler = createListHandler(collectionWithArrayRel, adapter, 100, 10);
    const result = await handler({
      body: null,
      headers: {},
      params: {},
      query: { populate: "tags" },
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as { data: Record<string, unknown>[] };
    expect(body.data[0].tags).toEqual({ id: "tag-1", name: "Tech" });
  });
});
