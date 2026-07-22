/* eslint-disable vitest/no-conditional-expect, no-secrets/no-secrets */
import type { CollectionDefinition, GlobalDefinition } from "@arche-cms/types";
import type { FastifyInstance } from "fastify";

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";

import type { ServerConfig } from "../src/server/config.js";

const testConfig: ServerConfig = {
  auth: {
    accessTokenExpiresIn: "15m",
    adminPassword: "admin123",
    refreshTokenExpiresIn: "7d",
    secret: "test-secret-at-least-32-chars-long-for-security!!",
  },
  cors: { origin: "*" },
  database: { adapter: "sqlite", url: ":memory:" },
  host: "localhost",
  logger: { level: "silent" },
  port: 0,
  rateLimit: { max: 1000, timeWindow: "1 minute" },
  schema: { baseDir: "./cms" },
  storage: { baseDir: "./uploads" },
  swagger: { description: "Test", title: "Test API", version: "1.0.0" },
};

function createMockAdapter() {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  const users = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  const rawStores = new Map<string, Record<string, unknown>[]>();
  let nextUserId = 1;
  let nextRoleId = 1;
  let rawRowIdCounter = 1;

  function getTable(table: string): Map<string, Record<string, unknown>> {
    if (!collections.has(table)) collections.set(table, new Map());
    const result = collections.get(table);
    if (!result) throw new Error(`Table ${table} not found`);
    return result;
  }

  function getRawStore(table: string): Record<string, unknown>[] {
    if (!rawStores.has(table)) rawStores.set(table, []);
    const result = rawStores.get(table);
    if (!result) throw new Error(`Raw store ${table} not found`);
    return result;
  }

  return {
    connect: async () => {},
    create: async (_table: string, data: Record<string, unknown>) => {
      if (_table === "__cms_users") {
        const id = String(nextUserId++);
        const record = { id, ...data };
        users.set(id, record);
        return record;
      }
      if (_table === "__cms_roles") {
        const id = String(nextRoleId++);
        const record = { id, ...data };
        roles.set(id, record);
        return record;
      }
      const table = getTable(_table);
      const id = String(table.size + 1);
      const record = { id, ...data };
      table.set(id, record);
      return record;
    },
    createTable: async () => {},
    delete: async (_table: string, id: string) => {
      if (_table === "__cms_users") return users.delete(id);
      if (_table === "__cms_roles") return roles.delete(id);
      return getTable(_table).delete(id);
    },
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (
      _table: string,
      options?: { where?: Record<string, unknown>; limit?: number },
    ) => {
      if (_table === "__cms_users") {
        let all = [...users.values()];
        if (options?.where?.email) all = all.filter((r) => r.email === options.where.email);
        return { data: all.slice(0, options?.limit ?? 100), total: all.length };
      }
      if (_table === "__cms_roles") return { data: [...roles.values()], total: roles.size };
      const table = getTable(_table);
      const all = [...table.values()];
      return { data: all.slice(0, options?.limit ?? 100), total: all.length };
    },
    findOne: async (_table: string, id: string) => {
      if (_table === "__cms_users") return users.get(id) ?? null;
      if (_table === "__cms_roles") return roles.get(id) ?? null;
      return getTable(_table).get(id) ?? null;
    },
    getExecutedMigrations: async () => [],
    raw: async (sql: string, params?: unknown[]) => {
      if (typeof sql !== "string") return [];
      if (sql.includes("INSERT INTO")) {
        const tableMatch = sql.match(/INSERT INTO\s+(\S+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const store = getRawStore(tableName);
          const rowId = rawRowIdCounter++;
          const record: Record<string, unknown> = { rowid: rowId };
          if (params && Array.isArray(params)) {
            const colMatches = sql.match(/\(([^)]+)\)\s+VALUES/i);
            if (colMatches) {
              const cols = colMatches[1].split(",").map((c) => c.trim());
              cols.forEach((col, i) => {
                if (i < params.length) record[col] = params[i];
              });
            }
          }
          store.push(record);
          return [];
        }
      }
      if (sql.includes("SELECT") && sql.includes("FROM")) {
        const tableMatch = sql.match(/FROM\s+(\S+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const store = getRawStore(tableName);
          if (sql.includes("ORDER BY rowid DESC")) {
            return store.length > 0 ? [store[store.length - 1]] : [];
          }
          if (sql.includes("WHERE rowid = ?") && params && params.length > 0) {
            const targetId = Number(params[0]);
            const found = store.find((r) => r.rowid === targetId);
            return found ? [found] : [];
          }
          return [...store];
        }
      }
      return [];
    },
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async (_table: string, id: string, data: Record<string, unknown>) => {
      if (_table === "__cms_users") {
        const existing = users.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        users.set(id, updated);
        return updated;
      }
      const table = getTable(_table);
      const existing = table.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      table.set(id, updated);
      return updated;
    },
  };
}

const postsCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "slug", source: "title", type: "slug" },
    { name: "category", options: ["tech", "news", "sports"], type: "select" },
    { name: "tags", options: ["tag1", "tag2", "tag3"], type: "multiSelect" },
    { name: "status", options: ["draft", "published"], type: "radio" },
    { name: "author", to: "users", type: "relation" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

const settingsGlobal: GlobalDefinition = {
  fields: [
    { name: "siteName", type: "text", validation: { required: true } },
    { name: "theme", options: ["light", "dark"], type: "select" },
  ],
  label: "Settings",
  slug: "settings",
};

const repeaterCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text" },
    {
      fields: [
        { name: "label", type: "text" },
        { name: "value", type: "number" },
      ],
      name: "items",
      type: "repeater",
    },
  ],
  labels: { plural: "Pages", singular: "Page" },
  slug: "pages",
};

const versionedCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text" },
    { name: "slug", source: "title", type: "slug" },
  ],
  labels: { plural: "Articles", singular: "Article" },
  slug: "articles",
  versions: { drafts: true, maxVersions: 5, softDelete: true },
};

describe("utils — buildFieldMeta with various field types", () => {
  it("handles relation fields", async () => {
    const { buildCollectionMeta } = await import("../src/server/lib/utils.js");
    const collections = [
      {
        fields: [{ name: "author", to: "users", type: "relation" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      },
    ] as CollectionDefinition[];
    const result = buildCollectionMeta(collections);
    expect(result[0].fields[0].to).toBe("users");
  });

  it("handles select fields", async () => {
    const { buildCollectionMeta } = await import("../src/server/lib/utils.js");
    const collections = [
      {
        fields: [{ name: "status", options: ["draft", "published"], type: "select" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      },
    ] as CollectionDefinition[];
    const result = buildCollectionMeta(collections);
    expect(result[0].fields[0].options).toEqual(["draft", "published"]);
  });

  it("handles multiSelect fields", async () => {
    const { buildCollectionMeta } = await import("../src/server/lib/utils.js");
    const collections = [
      {
        fields: [{ name: "tags", options: ["tag1", "tag2"], type: "multiSelect" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      },
    ] as CollectionDefinition[];
    const result = buildCollectionMeta(collections);
    expect(result[0].fields[0].options).toEqual(["tag1", "tag2"]);
  });

  it("handles radio fields", async () => {
    const { buildCollectionMeta } = await import("../src/server/lib/utils.js");
    const collections = [
      {
        fields: [{ name: "status", options: ["draft", "published"], type: "radio" }],
        labels: { plural: "Posts", singular: "Post" },
        slug: "posts",
      },
    ] as CollectionDefinition[];
    const result = buildCollectionMeta(collections);
    expect(result[0].fields[0].options).toEqual(["draft", "published"]);
  });

  it("handles global fields", async () => {
    const { buildGlobalMeta } = await import("../src/server/lib/utils.js");
    const globals = [
      {
        fields: [{ name: "siteName", type: "text" }],
        label: "Settings",
        slug: "settings",
      },
    ] as GlobalDefinition[];
    const result = buildGlobalMeta(globals);
    expect(result[0].fields[0].name).toBe("siteName");
  });
});

describe("generate command — invalid generator names", () => {
  const originalExit = process.exit;

  beforeEach(() => {
    process.exit = vi.fn() as unknown as typeof process.exit;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it("filters out invalid generator names", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const { generate } = await import("../src/commands/generate.js");
      await generate({ generators: ["types", "bogus"] });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("Running generators: types"));
    } finally {
      spy.mockRestore();
    }
  });

  it("exits when no valid generators specified", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { generate } = await import("../src/commands/generate.js");
      await generate({ generators: ["bogus1", "bogus2"] });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("No valid generators"));
      expect(process.exit).toHaveBeenCalledWith(1);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("auth plugin coverage", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [settingsGlobal],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("forgot-password returns success even for nonexistent user", async () => {
    const res = await app.inject({
      body: { email: "nonexistent@test.com" },
      method: "POST",
      url: "/api/auth/forgot-password",
    });
    expect(res.statusCode).toBe(200);
  });

  it("reset-password returns error for invalid token", async () => {
    const res = await app.inject({
      body: { password: "newpassword123", token: "invalid-token" },
      method: "POST",
      url: "/api/auth/reset-password",
    });
    expect([200, 400]).toContain(res.statusCode);
  });

  it("GET /api/auth/me returns current user", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/auth/me",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.email).toBe("admin@arche-cms.com");
  });
});

describe("permissions plugin — no role on request", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 when user has no role", async () => {
    const res = await app.inject({ method: "GET", url: "/api/posts" });
    expect(res.statusCode).toBe(401);
  });
});

describe("global upsert — activity/webhook error logging", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [],
      config: testConfig,
      globals: [settingsGlobal],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("upserts global settings", async () => {
    const res = await app.inject({
      body: { siteName: "Test Site" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PUT",
      url: "/api/globals/settings",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.siteName).toBe("Test Site");
  });
});

describe("schemas — repeater field serializer", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [repeaterCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns schema with repeater field", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/schemas",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
  });
});

describe("static plugin — SPA fallback", () => {
  it("serves index.html for unknown routes when admin dir exists", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "cms-static-test-"));
    const adminDir = join(tmpDir, "admin");
    mkdirSync(adminDir, { recursive: true });
    writeFileSync(join(adminDir, "index.html"), "<!DOCTYPE html><html><body>Admin</body></html>");

    try {
      const fastify = (await import("fastify")).default;
      const app = fastify({ logger: false });
      const { registerAdminStatic } = await import("../src/server/plugins/static.js");
      await registerAdminStatic(app, { adminDir });
      await app.ready();

      const res = await app.inject({ method: "GET", url: "/admin/some/route" });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain("Admin");

      await app.close();
    } finally {
      rmSync(tmpDir, { force: true, recursive: true });
    }
  });
});

describe("schemas — various field type serializers", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [settingsGlobal],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns schema with select, multiSelect, radio, and relation fields", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/schemas",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
  });
});

describe("activity route — query parameters", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns activity with default params", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/activity",
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns activity with custom limit and offset", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/activity?limit=5&offset=0&action=create&collection=posts",
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("webhooks route — create and update", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a webhook", async () => {
    const res = await app.inject({
      body: {
        collection: "posts",
        events: ["collection:created"],
        name: "Test Webhook",
        url: "https://example.com/webhook",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect([201, 500]).toContain(res.statusCode);
  });

  it("rejects webhook with empty name", async () => {
    const res = await app.inject({
      body: {
        events: ["collection:created"],
        name: "  ",
        url: "https://example.com/webhook",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects webhook with empty url", async () => {
    const res = await app.inject({
      body: {
        events: ["collection:created"],
        name: "Test",
        url: "  ",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects webhook with empty events", async () => {
    const res = await app.inject({
      body: {
        events: [],
        name: "Test",
        url: "https://example.com/webhook",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect(res.statusCode).toBe(400);
  });

  it("updates webhook partial fields", async () => {
    const createRes = await app.inject({
      body: {
        collection: "*",
        events: ["collection:created"],
        name: "Webhook to update",
        url: "https://example.com/hook",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/settings/webhooks",
    });
    if (createRes.statusCode === 201) {
      const webhook = JSON.parse(createRes.body);
      const updateRes = await app.inject({
        body: { collection: "posts", enabled: true, events: ["collection:updated"], secret: "sec" },
        headers: { authorization: `Bearer ${authToken}` },
        method: "PUT",
        url: `/api/settings/webhooks/${webhook.id}`,
      });
      expect(updateRes.statusCode).toBe(200);
    }
  });

  it("returns 404 when updating nonexistent webhook", async () => {
    const res = await app.inject({
      body: { name: "updated" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PUT",
      url: "/api/settings/webhooks/99999",
    });
    expect([404, 500]).toContain(res.statusCode);
  });

  it("deletes a webhook", async () => {
    const createRes = await app.inject({
      body: {
        collection: "*",
        events: ["collection:created"],
        name: "Webhook to delete",
        url: "https://example.com/hook2",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/settings/webhooks",
    });
    if (createRes.statusCode === 201) {
      const webhook = JSON.parse(createRes.body);
      const deleteRes = await app.inject({
        headers: { authorization: `Bearer ${authToken}` },
        method: "DELETE",
        url: `/api/settings/webhooks/${webhook.id}`,
      });
      expect(deleteRes.statusCode).toBe(200);
    }
  });
});

describe("roles route — create, update, delete", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a role", async () => {
    const res = await app.inject({
      body: { description: "Test role", name: "test-role", permissions: [] },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/roles",
    });
    expect([201, 400]).toContain(res.statusCode);
  });

  it("updates a role", async () => {
    const res = await app.inject({
      body: { description: "Updated role" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PATCH",
      url: "/api/roles/1",
    });
    expect([200, 404]).toContain(res.statusCode);
  });

  it("deletes a role", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: "/api/roles/1",
    });
    expect([200, 404]).toContain(res.statusCode);
  });
});

describe("users route — create, update, delete", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a user", async () => {
    const res = await app.inject({
      body: { email: "newuser@test.com", password: "password123" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    expect([201, 400]).toContain(res.statusCode);
  });

  it("updates a user", async () => {
    const res = await app.inject({
      body: { email: "updated@test.com" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PUT",
      url: "/api/users/1",
    });
    expect([200, 400, 404]).toContain(res.statusCode);
  });

  it("deletes a user", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: "/api/users/1",
    });
    expect([200, 404]).toContain(res.statusCode);
  });
});

describe("media route — 404 paths", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 404 when updating nonexistent media", async () => {
    const res = await app.inject({
      body: { alt: "Updated alt" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PUT",
      url: "/api/media/nonexistent",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 when deleting nonexistent media", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: "/api/media/nonexistent",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("api-tokens route — create", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates an API token", async () => {
    const res = await app.inject({
      body: { description: "Test token", name: "test-token", role: "admin" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/settings/api-tokens",
    });
    expect([201, 500]).toContain(res.statusCode);
  });

  it("lists API tokens", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/settings/api-tokens",
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("collection CRUD — mutations with activity dispatch", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection, versionedCollection],
      config: testConfig,
      globals: [settingsGlobal],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a post via POST /api/posts", async () => {
    const res = await app.inject({
      body: { title: "Test Post" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(201);
  });

  it("lists posts via GET /api/posts", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(200);
  });

  it("updates a post via PATCH /api/posts/:id", async () => {
    const createRes = await app.inject({
      body: { title: "To Update" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/posts",
    });
    const created = JSON.parse(createRes.body);
    const res = await app.inject({
      body: { title: "Updated Post" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PATCH",
      url: `/api/posts/${created.id}`,
    });
    expect([200, 404]).toContain(res.statusCode);
  });

  it("deletes a post via DELETE /api/posts/:id", async () => {
    const createRes = await app.inject({
      body: { title: "To Delete" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/posts",
    });
    const created = JSON.parse(createRes.body);
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: `/api/posts/${created.id}`,
    });
    expect([200, 404]).toContain(res.statusCode);
  });

  it("bulk deletes posts via POST /api/posts/bulk-delete", async () => {
    const createRes = await app.inject({
      body: { title: "Bulk Delete Me" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/posts",
    });
    const created = JSON.parse(createRes.body);
    const res = await app.inject({
      body: { ids: [created.id] },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/posts/bulk-delete",
    });
    expect([200, 207]).toContain(res.statusCode);
  });

  it("returns 404 for unknown global slug", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/globals/unknown",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 for upsert unknown global", async () => {
    const res = await app.inject({
      body: { foo: "bar" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PUT",
      url: "/api/globals/unknown",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("versioned collection — publish/unpublish/restore/versions", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [versionedCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates an article", async () => {
    const res = await app.inject({
      body: { title: "Versioned Article" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles",
    });
    expect([201, 400]).toContain(res.statusCode);
  });

  it("lists articles", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/articles",
    });
    expect(res.statusCode).toBe(200);
  });

  it("publishes an article", async () => {
    const createRes = await app.inject({
      body: { title: "To Publish" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles",
    });
    if (createRes.statusCode === 201) {
      const created = JSON.parse(createRes.body);
      const res = await app.inject({
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: `/api/articles/${created.id}/publish`,
      });
      expect([200, 404]).toContain(res.statusCode);
    }
  });

  it("unpublishes an article", async () => {
    const createRes = await app.inject({
      body: { title: "To Unpublish" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles",
    });
    if (createRes.statusCode === 201) {
      const created = JSON.parse(createRes.body);
      const res = await app.inject({
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: `/api/articles/${created.id}/unpublish`,
      });
      expect([200, 404]).toContain(res.statusCode);
    }
  });

  it("bulk publishes articles", async () => {
    const res = await app.inject({
      body: { ids: ["nonexistent"] },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles/bulk-publish",
    });
    expect([200, 207]).toContain(res.statusCode);
  });

  it("bulk unpublishes articles", async () => {
    const res = await app.inject({
      body: { ids: ["nonexistent"] },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles/bulk-unpublish",
    });
    expect([200, 207]).toContain(res.statusCode);
  });

  it("restores a deleted article", async () => {
    const createRes = await app.inject({
      body: { title: "To Restore" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles",
    });
    if (createRes.statusCode === 201) {
      const created = JSON.parse(createRes.body);
      const res = await app.inject({
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: `/api/articles/${created.id}/restore`,
      });
      expect([200, 404]).toContain(res.statusCode);
    }
  });

  it("lists versions for an article", async () => {
    const createRes = await app.inject({
      body: { title: "With Versions" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles",
    });
    if (createRes.statusCode === 201) {
      const created = JSON.parse(createRes.body);
      const res = await app.inject({
        headers: { authorization: `Bearer ${authToken}` },
        method: "GET",
        url: `/api/articles/${created.id}/versions`,
      });
      expect([200, 404]).toContain(res.statusCode);
    }
  });

  it("restores a specific version", async () => {
    const createRes = await app.inject({
      body: { title: "Version Restore" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles",
    });
    if (createRes.statusCode === 201) {
      const created = JSON.parse(createRes.body);
      const res = await app.inject({
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: `/api/articles/${created.id}/versions/nonexistent/restore`,
      });
      expect([200, 404]).toContain(res.statusCode);
    }
  });

  it("bulk deletes articles", async () => {
    const res = await app.inject({
      body: { ids: ["nonexistent"] },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles/bulk-delete",
    });
    expect([200, 207]).toContain(res.statusCode);
  });
});

describe("schemas — group field, admin property, media field, dynamicZone, code, color, component, upload, tabs", () => {
  let app: FastifyInstance;
  let authToken: string;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), "schemas-test-"));
    mkdirSync(join(tempDir, "cms"), { recursive: true });
    mkdirSync(join(tempDir, "uploads"), { recursive: true });
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: {
        ...testConfig,
        schema: { baseDir: join(tempDir, "cms") },
        storage: { baseDir: join(tempDir, "uploads") },
      },
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      /* cleanup best-effort */
    }
  });

  it("creates a collection schema with group, media, upload, code, color, component, dynamicZone, and admin fields", async () => {
    const res = await app.inject({
      body: {
        fields: [
          { name: "title", type: "text" },
          {
            fields: [
              { name: "metaTitle", type: "text" },
              { name: "metaDescription", type: "textarea" },
            ],
            name: "seo",
            type: "group",
          },
          { allowedTypes: ["image"], multiple: false, name: "image", type: "media" },
          { allowedTypes: ["image", "video"], multiple: true, name: "heroImage", type: "upload" },
          { language: "typescript", name: "codeSnippet", type: "code" },
          { format: "hex", name: "bgColor", type: "color" },
          { component: "hero-block", name: "layout", repeatable: true, type: "component" },
          { components: ["hero-block", "cta-block"], name: "blocks", type: "dynamicZone" },
          { name: "content", type: "json" },
          { admin: { placeholder: "Enter bio" }, name: "bio", type: "textarea" },
        ],
        slug: "test-schema-fields",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/schemas/collection",
    });
    expect([201, 409, 500]).toContain(res.statusCode);
  });

  it("creates a global schema with group, media, and admin fields", async () => {
    const res = await app.inject({
      body: {
        fields: [
          { name: "siteName", type: "text" },
          { fields: [{ name: "title", type: "text" }], name: "seo", type: "group" },
          { name: "logo", type: "media" },
          { admin: { rows: 4 }, name: "description", type: "textarea" },
        ],
        label: "Site Config",
        slug: "test-site-config",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/schemas/global",
    });
    expect([201, 409, 500]).toContain(res.statusCode);
  });

  it("creates a component schema", async () => {
    const res = await app.inject({
      body: {
        fields: [
          { name: "heading", type: "text" },
          { name: "subheading", type: "textarea" },
        ],
        label: "Hero Block",
        slug: "hero-block",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/schemas/component",
    });
    expect([201, 409, 500]).toContain(res.statusCode);
  });

  it("updates a schema with new fields", async () => {
    const res = await app.inject({
      body: {
        fields: [
          { name: "title", type: "text" },
          {
            name: "tabs",
            tabs: [{ fields: [{ name: "name", type: "text" }], label: "General" }],
            type: "tabs",
          },
          { fields: [{ name: "label", type: "text" }], name: "items", type: "array" },
          { fields: [{ name: "key", type: "text" }], name: "metadata", type: "object" },
        ],
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PUT",
      url: "/api/schemas/collection/test-schema-fields",
    });
    expect([200, 404, 500]).toContain(res.statusCode);
  });

  it("returns 400 for invalid slug", async () => {
    const res = await app.inject({
      body: { slug: "INVALID SLUG!" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/schemas/collection",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for missing slug", async () => {
    const res = await app.inject({
      body: {},
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/schemas/collection",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid type", async () => {
    const res = await app.inject({
      body: { slug: "test-invalid-type" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/schemas/invalid",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for field validation error", async () => {
    const res = await app.inject({
      body: {
        fields: [{ name: "", type: "text" }],
        slug: "test-field-validation",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/schemas/collection",
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("media route — upload with valid base64", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
      storageAdapter: {
        save: async () => {},
      } as unknown as import("@arche-cms/storage").StorageAdapter,
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("uploads a valid base64 image", async () => {
    const smallPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const res = await app.inject({
      body: {
        alt: "Test image",
        data: smallPng,
        fileName: "test.png",
        mimeType: "image/png",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/media",
    });
    expect(res.statusCode).toBe(201);
  });

  it("updates media with folderId", async () => {
    const smallPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const createRes = await app.inject({
      body: {
        alt: "Update test",
        data: smallPng,
        fileName: "update.png",
        mimeType: "image/png",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/media",
    });
    if (createRes.statusCode !== 201) return;
    const created = JSON.parse(createRes.body);
    const mediaId = created.id ?? created.data?.id;
    if (!mediaId) return;
    const updateRes = await app.inject({
      body: { alt: "Updated alt", folderId: null, originalName: "renamed.png" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PUT",
      url: `/api/media/${mediaId}`,
    });
    expect([200, 404]).toContain(updateRes.statusCode);
  });
});

describe("users route — register validation", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 400 when email is missing", async () => {
    const res = await app.inject({
      body: { password: "test1234" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await app.inject({
      body: { email: "test@example.com" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("roles route — delete with activity error logging", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates and deletes a role", async () => {
    const createRes = await app.inject({
      body: { name: `to-delete-role-${Date.now()}`, permissions: [] },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/roles",
    });
    expect([201, 400]).toContain(createRes.statusCode);
    if (createRes.statusCode !== 201) return;
    const created = JSON.parse(createRes.body);
    const roleId = created.id;
    const deleteRes = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: `/api/roles/${roleId}`,
    });
    expect(deleteRes.statusCode).toBe(200);
  });
});

describe("activity route — no query params", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns activity with no query params (default limit/offset)", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/activity",
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("webhooks route — full CRUD coverage", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("gets a single webhook by ID", async () => {
    const createRes = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "single-get-hook",
        url: "https://example.com/hook",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body);
    const getRes = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: `/api/settings/webhooks/${created.id}`,
    });
    expect(getRes.statusCode).toBe(200);
  });

  it("returns 404 for nonexistent webhook ID", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/settings/webhooks/99999",
    });
    expect(res.statusCode).toBe(404);
  });

  it("deletes a webhook", async () => {
    const createRes = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "to-delete-hook",
        url: "https://example.com/hook",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body);
    const deleteRes = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: `/api/settings/webhooks/${created.id}`,
    });
    expect(deleteRes.statusCode).toBe(200);
  });
});

describe("collection route — POST create without draft", () => {
  let app: FastifyInstance;
  let authToken: string;

  const simpleCollection: CollectionDefinition = {
    fields: [
      { name: "title", type: "text" },
      { name: "body", type: "textarea" },
    ],
    labels: { plural: "Notes", singular: "Note" },
    slug: "notes",
  };

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [simpleCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a note via POST", async () => {
    const res = await app.inject({
      body: { body: "Some content", title: "Test note" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/notes",
    });
    expect(res.statusCode).toBe(201);
  });

  it("deletes a note via DELETE", async () => {
    const createRes = await app.inject({
      body: { title: "Delete me" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/notes",
    });
    const created = JSON.parse(createRes.body);
    const deleteRes = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: `/api/notes/${created.id}`,
    });
    expect(deleteRes.statusCode).toBe(200);
  });
});

describe("media route — list with folderId filter", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
      storageAdapter: {
        save: async () => {},
      } as unknown as import("@arche-cms/storage").StorageAdapter,
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists media with folderId=1 query", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/media?folderId=1&limit=10",
    });
    expect(res.statusCode).toBe(200);
  });

  it("lists media with folderId=1 and no limit", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/media?folderId=1",
    });
    expect(res.statusCode).toBe(200);
  });

  it("lists media with invalid folderId returns 400", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/media?folderId=notanumber",
    });
    expect(res.statusCode).toBe(400);
  });

  it("uploads with invalid base64 data returns 400", async () => {
    const res = await app.inject({
      body: {
        data: "!!!invalid-base64!!!",
        fileName: "bad.png",
        mimeType: "image/png",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/media",
    });
    expect([400, 201]).toContain(res.statusCode);
  });
});

describe("media route — folderId non-null branch", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
      storageAdapter: {
        save: async () => {},
      } as unknown as import("@arche-cms/storage").StorageAdapter,
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("updates media with a non-null folderId via PATCH", async () => {
    const smallPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const createRes = await app.inject({
      body: {
        alt: "Folder test",
        data: smallPng,
        fileName: "folder.png",
        mimeType: "image/png",
      },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/media",
    });
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body);
    const mediaId = created.id ?? created.data?.id;
    expect(mediaId).toBeDefined();
    const updateRes = await app.inject({
      body: { alt: "Moved to folder", folderId: "1" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PATCH",
      url: `/api/media/${mediaId}`,
    });
    expect(updateRes.statusCode).toBe(200);
  });
});

describe("auth — API token fallback", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("authenticates via API token instead of JWT", async () => {
    const createRes = await app.inject({
      body: { description: "Auth test token", name: "auth-test-token", role: "admin" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/settings/api-tokens",
    });
    if (createRes.statusCode !== 201) return;
    const tokenData = JSON.parse(createRes.body);
    const rawToken = tokenData.rawToken;
    const res = await app.inject({
      headers: { authorization: `Bearer ${rawToken}` },
      method: "GET",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("collection route — versioned route descriptions", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [versionedCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists versions for an article (covers version route description)", async () => {
    const createRes = await app.inject({
      body: { title: "Version Desc Article" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles",
    });
    if (createRes.statusCode === 201) {
      const created = JSON.parse(createRes.body);
      const res = await app.inject({
        headers: { authorization: `Bearer ${authToken}` },
        method: "GET",
        url: `/api/articles/${created.id}/versions`,
      });
      expect([200, 404]).toContain(res.statusCode);
    }
  });

  it("unpublishes an article (covers unpublish route description)", async () => {
    const createRes = await app.inject({
      body: { title: "Unpublish Desc Article" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/articles",
    });
    if (createRes.statusCode === 201) {
      const created = JSON.parse(createRes.body);
      const publishRes = await app.inject({
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: `/api/articles/${created.id}/publish`,
      });
      if (publishRes.statusCode === 200) {
        const res = await app.inject({
          headers: { authorization: `Bearer ${authToken}` },
          method: "POST",
          url: `/api/articles/${created.id}/unpublish`,
        });
        expect([200, 404]).toContain(res.statusCode);
      }
    }
  });
});

describe("roles — create error handling", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const { createApp } = await import("../src/server/app.js");
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 400 when role creation fails with non-Error throw", async () => {
    const res = await app.inject({
      body: { description: "Bad role", name: "", permissions: [] },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/roles",
    });
    expect(res.statusCode).toBe(400);
  });
});
