import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition, GlobalDefinition } from "@arche-cms/types";
import type { FastifyInstance } from "fastify";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";

function createMockAdapter(): DatabaseAdapter {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  const users = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  const activity: Array<Record<string, unknown>> = [];
  let nextUserId = 1;
  let nextRoleId = 1;

  function getTable(table: string): Map<string, Record<string, unknown>> {
    if (!collections.has(table)) {
      collections.set(table, new Map());
    }
    return collections.get(table) ?? new Map();
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
      const nextId = String(table.size + 1);
      const record = { id: nextId, ...data };
      table.set(nextId, record);
      return record;
    },
    createTable: async () => {},
    delete: async (_table: string, id: string) => {
      const table = getTable(_table);
      return table.delete(id);
    },
    deleteMany: async (_table: string, ids: string[]) => {
      const table = getTable(_table);
      let count = 0;
      for (const id of ids) {
        if (table.delete(id)) count++;
      }
      return count;
    },
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (_table: string, options?) => {
      if (_table === "__cms_users") {
        let all = [...users.values()];
        if (options?.where?.email) {
          all = all.filter((r) => r.email === options.where.email);
        }
        return { data: all.slice(0, options?.limit ?? 100), total: all.length };
      }
      if (_table === "__cms_roles") {
        let all = [...roles.values()];
        if (options?.where?.name) {
          all = all.filter((r) => r.name === options.where.name);
        }
        return { data: all.slice(0, options?.limit ?? 100), total: all.length };
      }
      const table = getTable(_table);
      let all = [...table.values()];
      if (options?.where) {
        for (const [key, value] of Object.entries(options.where)) {
          all = all.filter((r) => r[key] === value);
        }
      }
      if (options?.sort) {
        const sortKey = Object.keys(options.sort)[0];
        if (sortKey) {
          const dir = options.sort[sortKey];
          all.sort((a, b) => {
            const av = a[sortKey] ?? "";
            const bv = b[sortKey] ?? "";
            if (dir === "desc") return String(bv).localeCompare(String(av));
            return String(av).localeCompare(String(bv));
          });
        }
      }
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? 100;
      return { data: all.slice(offset, offset + limit), total: all.length };
    },
    findOne: async (_table: string, id: string) => {
      if (_table === "__cms_users") return users.get(id) ?? null;
      if (_table === "__cms_roles") return roles.get(id) ?? null;
      const table = getTable(_table);
      return table.get(id) ?? null;
    },
    getExecutedMigrations: async () => [],
    getExistingSchema: async () => ({ tables: new Map() }),
    raw: async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO __cms_activity")) {
        const entry = {
          action: params?.[0] ?? "",
          collection: params?.[1] ?? "",
          createdAt: new Date().toISOString(),
          documentId: params?.[2] ?? null,
          id: String(activity.length + 1),
          label: params?.[3] ?? "",
        };
        activity.push(entry);
        return [];
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
      if (_table === "__cms_roles") {
        const existing = roles.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        roles.set(id, updated);
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

const testCollection: CollectionDefinition = {
  fields: [{ name: "title", type: "text" }],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

const testGlobal: GlobalDefinition = {
  fields: [{ name: "siteName", type: "text" }],
  label: "Site Settings",
  slug: "site-settings",
};

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

describe("Global Routes Extra", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [],
      config: testConfig,
      globals: [testGlobal],
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

  const auth = () => ({ authorization: `Bearer ${authToken}` });

  it("GET /api/globals/site-settings returns 200 with empty object", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/globals/site-settings",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toBeDefined();
  });

  it("PUT /api/globals/site-settings upserts global data", async () => {
    const res = await app.inject({
      body: { siteName: "My Blog" },
      headers: auth(),
      method: "PUT",
      url: "/api/globals/site-settings",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.siteName).toBe("My Blog");
  });

  it("PUT /api/globals/site-settings updates existing global data", async () => {
    const res = await app.inject({
      body: { siteName: "Updated Blog" },
      headers: auth(),
      method: "PUT",
      url: "/api/globals/site-settings",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.siteName).toBe("Updated Blog");
  });

  it("GET /api/globals/unknown-slug returns 404", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/globals/unknown-slug",
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Unknown global");
  });

  it("PUT /api/globals/unknown-slug returns 404", async () => {
    const res = await app.inject({
      body: { value: "test" },
      headers: auth(),
      method: "PUT",
      url: "/api/globals/unknown-slug",
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Unknown global");
  });

  it("rejects unauthenticated global requests", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/globals/site-settings",
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("Collection Routes Extra", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [testCollection],
      config: testConfig,
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

  const auth = () => ({ authorization: `Bearer ${authToken}` });

  it("POST /api/posts creates a collection entry", async () => {
    const res = await app.inject({
      body: { title: "Hello World" },
      headers: auth(),
      method: "POST",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("Hello World");
    expect(body.id).toBeDefined();
  });

  it("GET /api/posts lists collection entries", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/posts supports pagination via limit and offset", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/posts?limit=1&offset=0",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeLessThanOrEqual(1);
  });

  it("GET /api/posts/:id returns a single entry", async () => {
    const createRes = await app.inject({
      body: { title: "Get Me" },
      headers: auth(),
      method: "POST",
      url: "/api/posts",
    });
    const createdId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: `/api/posts/${createdId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("Get Me");
    expect(body.id).toBe(createdId);
  });

  it("GET /api/posts/:id returns 404 for unknown id", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/posts/9999",
    });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /api/posts/:id updates a collection entry", async () => {
    const createRes = await app.inject({
      body: { title: "Before Update" },
      headers: auth(),
      method: "POST",
      url: "/api/posts",
    });
    const createdId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      body: { title: "After Update" },
      headers: auth(),
      method: "PATCH",
      url: `/api/posts/${createdId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("After Update");
  });

  it("PATCH /api/posts/:id returns 404 for unknown id", async () => {
    const res = await app.inject({
      body: { title: "Ghost" },
      headers: auth(),
      method: "PATCH",
      url: "/api/posts/9999",
    });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/posts/:id deletes a collection entry", async () => {
    const createRes = await app.inject({
      body: { title: "Delete Me" },
      headers: auth(),
      method: "POST",
      url: "/api/posts",
    });
    const createdId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      headers: auth(),
      method: "DELETE",
      url: `/api/posts/${createdId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.deleted).toBe(true);
  });

  it("DELETE /api/posts/:id returns 404 for unknown id", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "DELETE",
      url: "/api/posts/9999",
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/posts/bulk-delete validates ids array is required", async () => {
    const res = await app.inject({
      body: {},
      headers: auth(),
      method: "POST",
      url: "/api/posts/bulk-delete",
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/posts with invalid body returns 400", async () => {
    const res = await app.inject({
      body: { title: 12345 },
      headers: auth(),
      method: "POST",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/posts with empty body succeeds (all fields optional)", async () => {
    const res = await app.inject({
      body: {},
      headers: auth(),
      method: "POST",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
  });

  it("rejects unauthenticated collection requests", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(401);
  });
});
