import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("@arche-cms/rest-api", async (importOriginal) => {
  const orig = (await importOriginal()) as Record<string, unknown>;
  return {
    ...orig,
    createCollectionRouters: orig.createCollectionRouters,
    createGlobalGetHandler: () => {
      throw new Error("Simulated global get handler error");
    },
    createGlobalUpsertHandler: () => {
      throw new Error("Simulated global upsert handler error");
    },
  };
});

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";

function createMockAdapter(): DatabaseAdapter {
  const users = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  let nextUserId = 1;
  let nextRoleId = 1;

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
      return {};
    },
    createTable: async () => {},
    delete: async () => true,
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (_table: string, options) => {
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
      return { data: [], total: 0 };
    },
    findOne: async (_table: string, id: string) => {
      if (_table === "__cms_users") return users.get(id) ?? null;
      if (_table === "__cms_roles") return roles.get(id) ?? null;
      return null;
    },
    getExecutedMigrations: async () => [],
    getExistingSchema: async () => ({ tables: new Map() }),
    raw: async () => [],
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
      return null;
    },
  };
}

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

describe("Global Routes — extra (error paths)", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [],
      config: testConfig,
      globals: [{ fields: [], label: "Settings", slug: "settings" }],
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

  it("GET /api/globals/:slug returns 500 when handler throws non-BadSlugError", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/globals/settings",
    });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Internal server error");
  });

  it("PUT /api/globals/:slug returns 500 when handler throws non-BadSlugError", async () => {
    const res = await app.inject({
      body: { siteName: "Test" },
      headers: auth(),
      method: "PUT",
      url: "/api/globals/settings",
    });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Internal server error");
  });

  it("GET /api/globals/:slug returns 404 for unknown global slug", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/globals/unknown-global",
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Unknown global");
  });

  it("PUT /api/globals/:slug returns 404 for unknown global slug", async () => {
    const res = await app.inject({
      body: {},
      headers: auth(),
      method: "PUT",
      url: "/api/globals/unknown-global",
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toContain("Unknown global");
  });

  it("rejects unauthenticated GET /api/globals/:slug", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/globals/settings",
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects unauthenticated PUT /api/globals/:slug", async () => {
    const res = await app.inject({
      body: {},
      method: "PUT",
      url: "/api/globals/settings",
    });
    expect(res.statusCode).toBe(401);
  });
});
