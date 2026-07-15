import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";
import { createApp } from "../src/server/app.js";
import type { ServerConfig } from "../src/server/config.js";

function createMockAdapter(): DatabaseAdapter {
  const users = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  let nextUserId = 1;
  let nextRoleId = 1;

  return {
    findOne: async (_table: string, id: string) => {
      if (_table === "__cms_users") return users.get(id) ?? null;
      if (_table === "__cms_roles") return roles.get(id) ?? null;
      return null;
    },
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
    delete: async (_table: string, id: string) => {
      if (_table === "__cms_users") return users.delete(id);
      return true;
    },
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

const testConfig: ServerConfig = {
  port: 0,
  host: "localhost",
  logger: { level: "silent" },
  cors: { origin: "*" },
  rateLimit: { max: 1000, timeWindow: "1 minute" },
  swagger: { title: "Test API", version: "1.0.0", description: "Test" },
  schema: { baseDir: "./cms" },
  database: { adapter: "sqlite", url: ":memory:" },
  auth: {
    secret: "test-secret-at-least-32-chars-long-for-security!!",
    accessTokenExpiresIn: "15m",
    refreshTokenExpiresIn: "7d",
  },
  storage: { baseDir: "./uploads" },
};

describe("Users Routes", () => {
  let app: FastifyInstance;
  let adapter: DatabaseAdapter;
  let authToken: string;

  beforeAll(async () => {
    adapter = createMockAdapter();
    app = await createApp({ config: testConfig, adapter, collections: [] });
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      body: { email: "admin@arche-cms.com", password: "admin123" },
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/users returns list of users", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/users",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.data[0].email).toBeDefined();
  });

  it("GET /api/users/:id returns a single user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/users/1",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.email).toBe("admin@arche-cms.com");
  });

  it("GET /api/users/:id returns 404 for unknown user", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/users/999",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("User not found");
  });

  it("PATCH /api/users/:id updates a user", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/users/1",
      headers: { authorization: `Bearer ${authToken}` },
      body: { email: "updated@test.com" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.email).toBe("updated@test.com");
  });

  it("PATCH /api/users/:id returns 404 for unknown user", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/users/999",
      headers: { authorization: `Bearer ${authToken}` },
      body: { email: "nobody@test.com" },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("User not found");
  });

  it("DELETE /api/users/:id deletes a user", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      body: { email: "delete-me@test.com", password: "password123" },
    });
    const newUserId = JSON.parse(regRes.body).user.id;

    const res = await app.inject({
      method: "DELETE",
      url: `/api/users/${newUserId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).message).toBe("User deleted");
  });

  it("DELETE /api/users/:id returns 404 for unknown user", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/users/999",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("User not found");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/api/users" });
    expect(res.statusCode).toBe(401);
  });
});
