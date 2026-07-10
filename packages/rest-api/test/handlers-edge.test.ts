import { describe, it, expect } from "vitest";
import type { CollectionDefinition, GlobalDefinition, DatabaseAdapter } from "@altrugenix/database";
import {
  createGlobalGetHandler,
  createGlobalUpsertHandler,
  createCreateHandler,
  createUpdateHandler,
  createListHandler,
  createGetHandler,
  createDeleteHandler,
  createBulkDeleteHandler,
  createRestoreHandler,
  createPublishHandler,
  createUnpublishHandler,
} from "../src/handlers.js";

function createGlobalAdapter(): DatabaseAdapter {
  let globalStore: Record<string, unknown> | null = null;
  return {
    findOne: async (_collection, id) => (id === "1" ? globalStore : null),
    findMany: async () => ({ data: [], total: 0 }),
    create: async (_collection, data) => {
      globalStore = { ...data };
      return globalStore;
    },
    update: async (_collection, id, data) => {
      if (id !== "1") return null;
      globalStore = { ...globalStore, ...data };
      return globalStore;
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

const globalDef: GlobalDefinition = {
  slug: "site-settings",
  label: "Site Settings",
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "description", type: "textarea" },
  ],
};

const collection: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "slug", type: "slug", validation: { required: true } },
  ],
};

describe("global handlers", () => {
  describe("createGlobalGetHandler", () => {
    it("returns empty object when no record exists", async () => {
      const adapter = createGlobalAdapter();
      const handler = createGlobalGetHandler(globalDef, adapter);
      const result = await handler({ params: {}, query: {}, body: null, headers: {} });
      expect(result.statusCode).toBe(200);
      expect(result.body).toEqual({});
    });

    it("returns existing record", async () => {
      const adapter = createGlobalAdapter();
      await adapter.create("__cms_site_settings", { title: "My Site" });
      const handler = createGlobalGetHandler(globalDef, adapter);
      const result = await handler({ params: {}, query: {}, body: null, headers: {} });
      expect(result.statusCode).toBe(200);
      const body = result.body as Record<string, unknown>;
      expect(body.title).toBe("My Site");
    });
  });

  describe("createGlobalUpsertHandler", () => {
    it("creates record when none exists", async () => {
      const adapter = createGlobalAdapter();
      const handler = createGlobalUpsertHandler(globalDef, adapter);
      const result = await handler({
        params: {},
        query: {},
        body: { title: "New Settings" },
        headers: {},
      });
      expect(result.statusCode).toBe(200);
      const body = result.body as Record<string, unknown>;
      expect(body.title).toBe("New Settings");
    });

    it("updates record when one exists", async () => {
      const adapter = createGlobalAdapter();
      await adapter.create("__cms_site_settings", { title: "Old" });
      const handler = createGlobalUpsertHandler(globalDef, adapter);
      const result = await handler({
        params: {},
        query: {},
        body: { title: "Updated" },
        headers: {},
      });
      expect(result.statusCode).toBe(200);
      const body = result.body as Record<string, unknown>;
      expect(body.title).toBe("Updated");
    });

    it("returns 400 for missing body", async () => {
      const adapter = createGlobalAdapter();
      const handler = createGlobalUpsertHandler(globalDef, adapter);
      const result = await handler({ params: {}, query: {}, body: null, headers: {} });
      expect(result.statusCode).toBe(400);
    });
  });
});

describe("unique constraint error handling", () => {
  function createAdapterWithUniqueError(): DatabaseAdapter {
    return {
      findOne: async () => null,
      findMany: async () => ({ data: [], total: 0 }),
      create: async () => {
        throw new Error("UNIQUE constraint failed: posts.slug");
      },
      update: async () => {
        throw new Error("UNIQUE constraint failed: posts.slug");
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

  it("createHandler returns 409 on unique constraint violation", async () => {
    const adapter = createAdapterWithUniqueError();
    const handler = createCreateHandler(collection, adapter);
    const result = await handler({
      params: {},
      query: {},
      body: { title: "Test", slug: "test" },
      headers: {},
    });
    expect(result.statusCode).toBe(409);
    expect(result.body).toHaveProperty("code", "CONFLICT");
  });

  it("updateHandler returns 409 on unique constraint violation", async () => {
    const adapter = createAdapterWithUniqueError();
    const handler = createUpdateHandler(collection, adapter);
    const result = await handler({
      params: { id: "1" },
      query: {},
      body: { slug: "taken" },
      headers: {},
    });
    expect(result.statusCode).toBe(409);
    expect(result.body).toHaveProperty("code", "CONFLICT");
  });
});

describe("adapter error handling", () => {
  function createFailingAdapter(): DatabaseAdapter {
    return {
      findOne: async () => {
        throw new Error("DB connection failed");
      },
      findMany: async () => {
        throw new Error("DB connection failed");
      },
      create: async () => {
        throw new Error("DB connection failed");
      },
      update: async () => {
        throw new Error("DB connection failed");
      },
      delete: async () => {
        throw new Error("DB connection failed");
      },
      deleteMany: async () => {
        throw new Error("DB connection failed");
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
  }

  it("listHandler returns 500 on adapter error", async () => {
    const adapter = createFailingAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({ params: {}, query: {}, body: null, headers: {} });
    expect(result.statusCode).toBe(500);
    expect(result.body).toHaveProperty("error", "Internal server error");
  });

  it("getHandler returns 500 on adapter error", async () => {
    const adapter = createFailingAdapter();
    const handler = createGetHandler(collection, adapter);
    const result = await handler({ params: { id: "1" }, query: {}, body: null, headers: {} });
    expect(result.statusCode).toBe(500);
    expect(result.body).toHaveProperty("error", "Internal server error");
  });

  it("createHandler returns 500 on adapter error", async () => {
    const adapter = createFailingAdapter();
    const handler = createCreateHandler(collection, adapter);
    const result = await handler({
      params: {},
      query: {},
      body: { title: "Test", slug: "test" },
      headers: {},
    });
    expect(result.statusCode).toBe(500);
  });

  it("updateHandler returns 500 on adapter error", async () => {
    const adapter = createFailingAdapter();
    const handler = createUpdateHandler(collection, adapter);
    const result = await handler({
      params: { id: "1" },
      query: {},
      body: { title: "Test" },
      headers: {},
    });
    expect(result.statusCode).toBe(500);
  });

  it("globalGetHandler returns 500 on adapter error", async () => {
    const adapter = createFailingAdapter();
    const handler = createGlobalGetHandler(
      { slug: "settings", label: "Settings", fields: [] },
      adapter,
    );
    const result = await handler({ params: {}, query: {}, body: null, headers: {} });
    expect(result.statusCode).toBe(500);
  });

  it("globalUpsertHandler returns 500 on adapter error", async () => {
    const adapter = createFailingAdapter();
    const handler = createGlobalUpsertHandler(
      { slug: "settings", label: "Settings", fields: [] },
      adapter,
    );
    const result = await handler({ params: {}, query: {}, body: { title: "Test" }, headers: {} });
    expect(result.statusCode).toBe(500);
  });
});

describe("query validation edge cases", () => {
  it("listHandler rejects invalid limit", async () => {
    const adapter = createGlobalAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({
      params: {},
      query: { limit: "invalid" },
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(400);
    expect(result.body).toHaveProperty("error");
  });

  it("listHandler rejects negative limit", async () => {
    const adapter = createGlobalAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({
      params: {},
      query: { limit: "-5" },
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(400);
  });

  it("listHandler rejects non-integer offset", async () => {
    const adapter = createGlobalAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({
      params: {},
      query: { offset: "abc" },
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(400);
  });

  it("listHandler rejects empty sort string", async () => {
    const adapter = createGlobalAdapter();
    const handler = createListHandler(collection, adapter, 100, 10);
    const result = await handler({
      params: {},
      query: { sort: "" },
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(400);
  });
});

function createDraftAdapter(): DatabaseAdapter {
  const store: Record<string, unknown>[] = [];
  let nextId = 1;
  return {
    findOne: async (_c, id) => store.find((r) => String(r.id) === id) ?? null,
    findMany: async (_c, opts) => {
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
      const total = data.length;
      return { data, total };
    },
    create: async (_c, d) => {
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

const draftCollection: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [{ name: "title", type: "text", validation: { required: true } }],
  versions: { drafts: true },
};

describe("draft/publish handlers", () => {
  it("createHandler sets _status to draft by default", async () => {
    const adapter = createDraftAdapter();
    const handler = createCreateHandler(draftCollection, adapter);
    const result = await handler({
      params: {},
      query: {},
      body: { title: "Test" },
      headers: {},
    });
    expect(result.statusCode).toBe(201);
    const body = result.body as Record<string, unknown>;
    expect(body._status).toBe("draft");
  });

  it("createHandler sets _status to published when specified", async () => {
    const adapter = createDraftAdapter();
    const handler = createCreateHandler(draftCollection, adapter);
    const result = await handler({
      params: {},
      query: {},
      body: { title: "Test", _status: "published" },
      headers: {},
    });
    expect(result.statusCode).toBe(201);
    const body = result.body as Record<string, unknown>;
    expect(body._status).toBe("published");
    expect(body._publishedAt).toBeDefined();
  });

  it("listHandler filters to published by default for draft-enabled collections", async () => {
    const adapter = createDraftAdapter();
    await adapter.create("__cms_posts", { title: "Draft 1", _status: "draft" });
    await adapter.create("__cms_posts", { title: "Pub 1", _status: "published" });
    await adapter.create("__cms_posts", { title: "Pub 2", _status: "published" });

    const handler = createListHandler(draftCollection, adapter, 100, 10);
    const result = await handler({ params: {}, query: {}, body: null, headers: {} });
    expect(result.statusCode).toBe(200);
    const body = result.body as { data: Record<string, unknown>[]; total: number };
    expect(body.total).toBe(2);
    expect(body.data.map((r: Record<string, unknown>) => r.title)).toEqual(["Pub 1", "Pub 2"]);
  });

  it("listHandler respects explicit _status filter", async () => {
    const adapter = createDraftAdapter();
    await adapter.create("__cms_posts", { title: "Draft 1", _status: "draft" });
    await adapter.create("__cms_posts", { title: "Pub 1", _status: "published" });

    const handler = createListHandler(draftCollection, adapter, 100, 10);
    const result = await handler({
      params: {},
      query: { "where[_status]": "draft" },
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as { data: Record<string, unknown>[]; total: number };
    expect(body.total).toBe(1);
    expect(body.data[0].title).toBe("Draft 1");
  });

  it("publishHandler sets _status to published", async () => {
    const adapter = createDraftAdapter();
    const created = await adapter.create("__cms_posts", { title: "Test", _status: "draft" });
    const handler = createPublishHandler(draftCollection, adapter);
    const result = await handler({
      params: { id: String(created.id) },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body._status).toBe("published");
    expect(body._publishedAt).toBeDefined();
  });

  it("unpublishHandler sets _status to draft", async () => {
    const adapter = createDraftAdapter();
    const created = await adapter.create("__cms_posts", {
      title: "Test",
      _status: "published",
      _publishedAt: "2024-01-01T00:00:00.000Z",
    });
    const handler = createUnpublishHandler(draftCollection, adapter);
    const result = await handler({
      params: { id: String(created.id) },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body._status).toBe("draft");
    expect(body._publishedAt).toBeNull();
  });

  it("publishHandler returns 404 for missing entry", async () => {
    const adapter = createDraftAdapter();
    const handler = createPublishHandler(draftCollection, adapter);
    const result = await handler({
      params: { id: "999" },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("updateHandler strips system fields from body", async () => {
    const adapter = createDraftAdapter();
    const created = await adapter.create("__cms_posts", { title: "Original", _status: "draft" });
    const handler = createUpdateHandler(draftCollection, adapter);
    const result = await handler({
      params: { id: String(created.id) },
      query: {},
      body: { title: "Updated", _status: "published" },
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.title).toBe("Updated");
    expect((body as Record<string, unknown>)._status).toBe("draft");
  });
});

function createSoftDeleteAdapter(): DatabaseAdapter {
  const store: Record<string, unknown>[] = [];
  let nextId = 1;
  return {
    findOne: async (_c, id) => store.find((r) => String(r.id) === id) ?? null,
    findMany: async (_c, opts) => {
      let data = [...store];
      if (opts?.where) {
        for (const [key, value] of Object.entries(opts.where)) {
          if (Array.isArray(value)) {
            data = data.filter((r) => value.includes(String(r[key])));
          } else if (value === null) {
            data = data.filter((r) => r[key] == null);
          } else {
            data = data.filter((r) => r[key] === value);
          }
        }
      }
      const total = data.length;
      return { data, total };
    },
    create: async (_c, d) => {
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
    delete: async (_c, id) => {
      const idx = store.findIndex((r) => String(r.id) === id);
      if (idx === -1) return false;
      store.splice(idx, 1);
      return true;
    },
    deleteMany: async (_c, ids) => {
      const before = store.length;
      const idSet = new Set(ids);
      store = store.filter((r) => !idSet.has(String(r.id)));
      return before - store.length;
    },
  };
}

const softDeleteCollection: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [{ name: "title", type: "text", validation: { required: true } }],
  versions: { softDelete: true },
};

describe("soft delete handlers", () => {
  it("deleteHandler sets _deletedAt instead of removing the record", async () => {
    const adapter = createSoftDeleteAdapter();
    const created = await adapter.create("__cms_posts", { title: "Test" });
    const handler = createDeleteHandler(softDeleteCollection, adapter);
    const result = await handler({
      params: { id: String(created.id) },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.deleted).toBe(true);

    const record = await adapter.findOne("__cms_posts", String(created.id));
    expect(record).not.toBeNull();
    expect((record as Record<string, unknown>)._deletedAt).toBeDefined();
  });

  it("deleteHandler hard-deletes when softDelete is not enabled", async () => {
    const adapter = createSoftDeleteAdapter();
    const handler = createDeleteHandler(collection, adapter);
    const created = await adapter.create("__cms_posts", { title: "Test" });
    const result = await handler({
      params: { id: String(created.id) },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);

    const record = await adapter.findOne("__cms_posts", String(created.id));
    expect(record).toBeNull();
  });

  it("listHandler excludes soft-deleted entries by default", async () => {
    const adapter = createSoftDeleteAdapter();
    await adapter.create("__cms_posts", { title: "Active" });
    await adapter.create("__cms_posts", {
      title: "Deleted",
      _deletedAt: "2024-01-01T00:00:00.000Z",
    });
    await adapter.create("__cms_posts", { title: "Another Active" });

    const handler = createListHandler(softDeleteCollection, adapter, 100, 10);
    const result = await handler({ params: {}, query: {}, body: null, headers: {} });
    expect(result.statusCode).toBe(200);
    const body = result.body as { data: Record<string, unknown>[]; total: number };
    expect(body.total).toBe(2);
    expect(body.data.map((r) => r.title)).toEqual(["Active", "Another Active"]);
  });

  it("listHandler includes deleted entries when deleted=true", async () => {
    const adapter = createSoftDeleteAdapter();
    await adapter.create("__cms_posts", { title: "Active" });
    await adapter.create("__cms_posts", {
      title: "Deleted",
      _deletedAt: "2024-01-01T00:00:00.000Z",
    });

    const handler = createListHandler(softDeleteCollection, adapter, 100, 10);
    const result = await handler({
      params: {},
      query: { deleted: "true" },
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as { data: Record<string, unknown>[]; total: number };
    expect(body.total).toBe(2);
  });

  it("restoreHandler clears _deletedAt", async () => {
    const adapter = createSoftDeleteAdapter();
    const created = await adapter.create("__cms_posts", {
      title: "Deleted",
      _deletedAt: "2024-01-01T00:00:00.000Z",
    });
    const handler = createRestoreHandler(softDeleteCollection, adapter);
    const result = await handler({
      params: { id: String(created.id) },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body._deletedAt).toBeNull();
  });

  it("restoreHandler returns 404 for missing entry", async () => {
    const adapter = createSoftDeleteAdapter();
    const handler = createRestoreHandler(softDeleteCollection, adapter);
    const result = await handler({
      params: { id: "999" },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("bulkDeleteHandler soft-deletes records", async () => {
    const adapter = createSoftDeleteAdapter();
    const a = await adapter.create("__cms_posts", { title: "A" });
    const b = await adapter.create("__cms_posts", { title: "B" });
    const handler = createBulkDeleteHandler(softDeleteCollection, adapter);
    const result = await handler({
      params: {},
      query: {},
      body: { ids: [String(a.id), String(b.id)] },
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as { deleted: number };
    expect(body.deleted).toBe(2);

    const list = await adapter.findMany("__cms_posts");
    expect(list.total).toBe(2);
    expect((list.data[0] as Record<string, unknown>)._deletedAt).toBeDefined();
    expect((list.data[1] as Record<string, unknown>)._deletedAt).toBeDefined();
  });

  it("deleteHandler returns 404 for missing entry", async () => {
    const adapter = createSoftDeleteAdapter();
    const handler = createDeleteHandler(softDeleteCollection, adapter);
    const result = await handler({
      params: { id: "999" },
      query: {},
      body: null,
      headers: {},
    });
    expect(result.statusCode).toBe(404);
  });
});

const scheduledCollection: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [{ name: "title", type: "text", validation: { required: true } }],
  versions: { drafts: true, scheduledPublishing: true },
};

describe("scheduled publishing handlers", () => {
  it("createHandler keeps status as draft when _publishAt is set", async () => {
    const adapter = createDraftAdapter();
    const handler = createCreateHandler(scheduledCollection, adapter);
    const result = await handler({
      params: {},
      query: {},
      body: { title: "Scheduled", _publishAt: "2099-01-01T00:00:00.000Z" },
      headers: {},
    });
    expect(result.statusCode).toBe(201);
    const body = result.body as Record<string, unknown>;
    expect(body._status).toBe("draft");
    expect(body._publishAt).toBe("2099-01-01T00:00:00.000Z");
  });

  it("createHandler publishes immediately when _status is explicitly published", async () => {
    const adapter = createDraftAdapter();
    const handler = createCreateHandler(scheduledCollection, adapter);
    const result = await handler({
      params: {},
      query: {},
      body: { title: "Publish Now", _status: "published", _publishAt: "2099-01-01T00:00:00.000Z" },
      headers: {},
    });
    expect(result.statusCode).toBe(201);
    const body = result.body as Record<string, unknown>;
    expect(body._status).toBe("published");
    expect(body._publishedAt).toBeDefined();
  });

  it("updateHandler preserves _publishAt in update", async () => {
    const adapter = createDraftAdapter();
    const created = await adapter.create("__cms_posts", {
      title: "Test",
      _status: "draft",
      _publishAt: "2099-01-01T00:00:00.000Z",
    });
    const handler = createUpdateHandler(scheduledCollection, adapter);
    const result = await handler({
      params: { id: String(created.id) },
      query: {},
      body: { title: "Updated" },
      headers: {},
    });
    expect(result.statusCode).toBe(200);
    const body = result.body as Record<string, unknown>;
    expect(body.title).toBe("Updated");
    expect(body._publishAt).toBe("2099-01-01T00:00:00.000Z");
  });
});
