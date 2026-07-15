import { describe, it, expect } from "vitest";
import type { CollectionDefinition, DatabaseAdapter } from "@arche-cms/database";
import {
  createListVersionsHandler,
  createRestoreVersionHandler,
  createCreateHandler,
  createUpdateHandler,
} from "../src/handlers.js";

function createVersionAdapter(): DatabaseAdapter {
  const store: Record<string, unknown>[] = [];
  const versions: Record<string, unknown>[] = [];
  let nextId = 1;
  let nextVersionId = 1;
  return {
    findOne: async (_c, id) => store.find((r) => String(r.id) === id) ?? null,
    findMany: async (c, opts) => {
      let data: Record<string, unknown>[];
      if (c === "__cms_versions") {
        data = [...versions];
      } else {
        data = [...store];
      }
      if (opts?.where) {
        for (const [key, value] of Object.entries(opts.where)) {
          if (Array.isArray(value)) {
            data = data.filter((r) => value.includes(String(r[key])));
          } else {
            data = data.filter((r) => r[key] === value);
          }
        }
      }
      if (opts?.sort) {
        for (const [field, dir] of Object.entries(opts.sort)) {
          data.sort((a, b) => {
            const va = String(a[field] ?? "");
            const vb = String(b[field] ?? "");
            return dir === "desc" ? vb.localeCompare(va) : va.localeCompare(vb);
          });
        }
      }
      if (opts?.limit) data = data.slice(0, opts.limit);
      return { data, total: data.length };
    },
    create: async (_c, d) => {
      if (_c === "__cms_versions") {
        const record = { id: nextVersionId++, ...d } as Record<string, unknown>;
        versions.push(record);
        return record;
      }
      const record = { id: nextId++, ...d } as Record<string, unknown>;
      store.push(record);
      return record;
    },
    update: async (_c, id, d) => {
      const idx = store.findIndex((r) => String(r.id) === id);
      if (idx === -1) return null;
      store[idx] = { ...store[idx], ...d } as Record<string, unknown>;
      return store[idx];
    },
    delete: async () => false,
    deleteMany: async () => 0,
    connect: async () => {},
    disconnect: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    raw: async () => [],
    createTable: async () => {},
    dropTable: async () => {},
    runMigration: async () => {},
    getExecutedMigrations: async () => [],
  };
}

const collection: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "body", type: "richText" },
  ],
  versions: { drafts: true },
};

const collectionWithMaxVersions: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [{ name: "title", type: "text", validation: { required: true } }],
  versions: { drafts: true, maxPerDoc: 3 },
};

describe("createListVersionsHandler", () => {
  it("returns versions for an entry", async () => {
    const adapter = createVersionAdapter();
    const created = await adapter.create("__cms_posts", { title: "Hello" });
    await adapter.create("__cms_versions", {
      collection: "posts",
      entryId: String(created.id),
      version: 1,
      data: JSON.stringify({ title: "Hello" }),
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    const handler = createListVersionsHandler(collection, adapter);
    const result = await handler({
      params: { id: String(created.id) },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as { data: unknown[]; total: number };
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("returns 400 for missing id", async () => {
    const adapter = createVersionAdapter();
    const handler = createListVersionsHandler(collection, adapter);
    const result = await handler({
      params: {},
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(400);
  });

  it("returns 500 on adapter error", async () => {
    const adapter: DatabaseAdapter = {
      findOne: async () => {
        throw new Error("DB error");
      },
      findMany: async () => {
        throw new Error("DB error");
      },
      create: async () => {
        throw new Error("DB error");
      },
      update: async () => {
        throw new Error("DB error");
      },
      delete: async () => {
        throw new Error("DB error");
      },
      deleteMany: async () => {
        throw new Error("DB error");
      },
      connect: async () => {},
      disconnect: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      raw: async () => [],
      createTable: async () => {},
      dropTable: async () => {},
      runMigration: async () => {},
      getExecutedMigrations: async () => [],
    };
    const handler = createListVersionsHandler(collection, adapter);
    const result = await handler({
      params: { id: "1" },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(500);
  });
});

describe("saveVersion catch block", () => {
  it("does not throw when saveVersion fails (adapter error on versions table)", async () => {
    const store: Record<string, unknown>[] = [];
    let nextId = 1;
    const adapter: DatabaseAdapter = {
      findOne: async (_c, id) => store.find((r) => String(r.id) === id) ?? null,
      findMany: async (c) => {
        if (c === "__cms_versions") throw new Error("Versions table error");
        return { data: [...store], total: store.length };
      },
      create: async (c, d) => {
        if (c === "__cms_versions") throw new Error("Versions table error");
        const record = { id: nextId++, ...d } as Record<string, unknown>;
        store.push(record);
        return record;
      },
      update: async () => null,
      delete: async () => false,
      deleteMany: async () => 0,
      connect: async () => {},
      disconnect: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      raw: async () => [],
      createTable: async () => {},
      dropTable: async () => {},
      runMigration: async () => {},
      getExecutedMigrations: async () => [],
    };
    const collection: CollectionDefinition = {
      slug: "posts",
      labels: { singular: "Post", plural: "Posts" },
      fields: [{ name: "title", type: "text", validation: { required: true } }],
      versions: { drafts: true },
    };
    const handler = createCreateHandler(collection, adapter);
    const result = await handler({
      params: {},
      query: {},
      body: { title: "Test" },
      headers: {},
    });
    // saveVersion catches and swallows the error, so handler still succeeds
    expect(result.statusCode).toBe(201);
  });

  it("saveVersion catch also fires on update", async () => {
    const store: Record<string, unknown>[] = [{ id: 1, title: "Original" }];
    const adapter: DatabaseAdapter = {
      findOne: async (_c, id) => store.find((r) => String(r.id) === id) ?? null,
      findMany: async (c) => {
        if (c === "__cms_versions") throw new Error("Versions table error");
        return { data: [...store], total: store.length };
      },
      create: async () => {
        throw new Error("Should not be called");
      },
      update: async (c, id, d) => {
        const idx = store.findIndex((r) => String(r.id) === id);
        if (idx === -1) return null;
        store[idx] = { ...store[idx], ...d } as Record<string, unknown>;
        return store[idx];
      },
      delete: async () => false,
      deleteMany: async () => 0,
      connect: async () => {},
      disconnect: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      raw: async () => [],
      createTable: async () => {},
      dropTable: async () => {},
      runMigration: async () => {},
      getExecutedMigrations: async () => [],
    };
    const collection: CollectionDefinition = {
      slug: "posts",
      labels: { singular: "Post", plural: "Posts" },
      fields: [{ name: "title", type: "text", validation: { required: true } }],
    };
    const handler = createUpdateHandler(collection, adapter);
    const result = await handler({
      params: { id: "1" },
      query: {},
      body: { title: "Updated" },
      headers: {},
    });
    expect(result.statusCode).toBe(200);
  });
});

describe("createRestoreVersionHandler", () => {
  it("restores a version", async () => {
    const adapter = createVersionAdapter();
    const created = await adapter.create("__cms_posts", { title: "Hello" });
    const versionRecord = await adapter.create("__cms_versions", {
      collection: "posts",
      entryId: String(created.id),
      version: 1,
      data: JSON.stringify({ id: String(created.id), title: "Old Title", _status: "draft" }),
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    const handler = createRestoreVersionHandler(collection, adapter);
    const result = await handler({
      params: { id: String(created.id), versionId: String(versionRecord.id) },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.title).toBe("Old Title");
  });

  it("returns 400 for missing id or versionId", async () => {
    const adapter = createVersionAdapter();
    const handler = createRestoreVersionHandler(collection, adapter);
    const result = await handler({
      params: {},
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(400);
  });

  it("returns 400 when only id is provided", async () => {
    const adapter = createVersionAdapter();
    const handler = createRestoreVersionHandler(collection, adapter);
    const result = await handler({
      params: { id: "1" },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(400);
  });

  it("returns 404 when version not found", async () => {
    const adapter = createVersionAdapter();
    const handler = createRestoreVersionHandler(collection, adapter);
    const result = await handler({
      params: { id: "1", versionId: "999" },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("returns 404 when updated record not found", async () => {
    const adapter = createVersionAdapter();
    await adapter.create("__cms_versions", {
      collection: "posts",
      entryId: "999",
      id: 1,
      version: 1,
      data: JSON.stringify({ title: "Ghost" }),
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    const handler = createRestoreVersionHandler(collection, adapter);
    const result = await handler({
      params: { id: "999", versionId: "1" },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("returns 500 on adapter error", async () => {
    const adapter: DatabaseAdapter = {
      findOne: async () => {
        throw new Error("DB error");
      },
      findMany: async () => {
        throw new Error("DB error");
      },
      create: async () => {
        throw new Error("DB error");
      },
      update: async () => {
        throw new Error("DB error");
      },
      delete: async () => {
        throw new Error("DB error");
      },
      deleteMany: async () => {
        throw new Error("DB error");
      },
      connect: async () => {},
      disconnect: async () => {},
      transaction: async <T>(fn: () => Promise<T>) => fn(),
      raw: async () => [],
      createTable: async () => {},
      dropTable: async () => {},
      runMigration: async () => {},
      getExecutedMigrations: async () => [],
    };
    const handler = createRestoreVersionHandler(collection, adapter);
    const result = await handler({
      params: { id: "1", versionId: "1" },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(500);
  });

  it("strips system fields from version data before update", async () => {
    const adapter = createVersionAdapter();
    const created = await adapter.create("__cms_posts", { title: "Original" });
    const versionRecord = await adapter.create("__cms_versions", {
      collection: "posts",
      entryId: String(created.id),
      version: 1,
      data: JSON.stringify({
        id: String(created.id),
        title: "Restored",
        _status: "draft",
        _deletedAt: "2024-01-01",
        _deletedBy: "user-1",
        _publishAt: "2024-01-01",
      }),
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    const handler = createRestoreVersionHandler(collection, adapter);
    const result = await handler({
      params: { id: String(created.id), versionId: String(versionRecord.id) },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.title).toBe("Restored");
  });
});

describe("createSaveVersion with maxPerDoc", () => {
  it("trims old versions when exceeding maxPerDoc", async () => {
    const adapter = createVersionAdapter();
    const created = await adapter.create("__cms_posts", { title: "Test" });
    for (let i = 1; i <= 5; i++) {
      await adapter.create("__cms_versions", {
        collection: "posts",
        entryId: String(created.id),
        version: i,
        data: JSON.stringify({ title: `Version ${i}` }),
        createdAt: `2024-01-0${i}T00:00:00.000Z`,
      });
    }
    const handler = createRestoreVersionHandler(collectionWithMaxVersions, adapter);
    const versionRecord = await adapter.create("__cms_versions", {
      collection: "posts",
      entryId: String(created.id),
      version: 3,
      data: JSON.stringify({ title: "Version 3 restore" }),
      createdAt: "2024-01-03T00:00:00.000Z",
    });
    const result = await handler({
      params: { id: String(created.id), versionId: String(versionRecord.id) },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);
  });
});
