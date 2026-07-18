import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";
import { recordActivity } from "../src/server/lib/activity.js";

function createMockAdapter(): DatabaseAdapter {
  const activity: Array<Record<string, unknown>> = [];
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
    findMany: async (_table, options) => {
      if (_table === "__cms_activity") {
        const filtered = options?.where?.email ? [] : [...activity].reverse();
        return { data: filtered.slice(0, options?.limit ?? 100), total: filtered.length };
      }
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
      if (sql.includes("SELECT") && sql.includes("__cms_activity")) {
        return [...activity].reverse().slice(0, (params?.[0] as number) ?? 10);
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

describe("Activity Route", () => {
  let app: FastifyInstance;
  let adapter: DatabaseAdapter;
  let authToken: string;

  beforeAll(async () => {
    adapter = createMockAdapter();
    app = await createApp({ adapter, collections: [], config: testConfig });
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

  it("returns empty activity when no entries exist", async () => {
    const res = await app.inject({ headers: auth(), method: "GET", url: "/api/activity" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns recorded activity entries", async () => {
    await recordActivity(adapter, {
      action: "create",
      collection: "posts",
      documentId: "1",
      label: "Created post",
    });
    const res = await app.inject({ headers: auth(), method: "GET", url: "/api/activity" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.data[0].action).toBe("create");
    expect(body.data[0].collection).toBe("posts");
  });

  it("returns multiple entries in reverse chronological order", async () => {
    await recordActivity(adapter, { action: "update", collection: "posts", documentId: "1" });
    await recordActivity(adapter, { action: "delete", collection: "pages", documentId: "2" });
    const res = await app.inject({ headers: auth(), method: "GET", url: "/api/activity" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(3);
    expect(body.data[0].action).toBe("delete");
  });

  it("limits results to 10 entries by default", async () => {
    for (let i = 0; i < 15; i++) {
      await recordActivity(adapter, {
        action: "create",
        collection: "test",
        documentId: String(i),
      });
    }
    const res = await app.inject({ headers: auth(), method: "GET", url: "/api/activity" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeLessThanOrEqual(10);
  });
});
