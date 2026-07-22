import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

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
    delete: async (_table: string, id: string) => {
      if (_table === "__cms_users") return users.delete(id);
      return true;
    },
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

describe("Users Routes", () => {
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

  it("GET /api/users returns list of users", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.data[0].email).toBeDefined();
  });

  it("GET /api/users/:id returns a single user", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/users/1",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.email).toBe("admin@arche-cms.com");
  });

  it("GET /api/users/:id returns 404 for unknown user", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/users/999",
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("User not found");
  });

  it("PATCH /api/users/:id updates a user", async () => {
    const res = await app.inject({
      body: { email: "updated@test.com" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PATCH",
      url: "/api/users/1",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.email).toBe("updated@test.com");
  });

  it("PATCH /api/users/:id returns 404 for unknown user", async () => {
    const res = await app.inject({
      body: { email: "nobody@test.com" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PATCH",
      url: "/api/users/999",
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("User not found");
  });

  it("DELETE /api/users/:id deletes a user", async () => {
    const createRes = await app.inject({
      body: { email: "delete-me@test.com", password: "password123" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    const newUserId = JSON.parse(createRes.body).user.id;

    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: `/api/users/${newUserId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).message).toBe("User deleted");
  });

  it("DELETE /api/users/:id returns 404 for unknown user", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: "/api/users/999",
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("User not found");
  });

  it("DELETE /api/users/1 rejects deleting the default admin", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: "/api/users/1",
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain("default admin");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/api/users" });
    expect(res.statusCode).toBe(401);
  });

  it("PATCH /api/users/:id with role update succeeds", async () => {
    const createRes = await app.inject({
      body: { email: "role-target@test.com", password: "password123" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    const userId = JSON.parse(createRes.body).user.id;

    const res = await app.inject({
      body: { role: "admin" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PATCH",
      url: `/api/users/${userId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.role).toBe("admin");
  });

  it("PATCH /api/users/:id persists name field", async () => {
    const createRes = await app.inject({
      body: { email: "name-test@test.com", password: "password123" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    const userId = JSON.parse(createRes.body).user.id;

    const res = await app.inject({
      body: { email: "name-test@test.com", name: "Alchie Tagudin", role: "admin" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PATCH",
      url: `/api/users/${userId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.email).toBe("name-test@test.com");
    expect(body.name).toBe("Alchie Tagudin");
  });

  it("PATCH /api/users/:id with password update succeeds", async () => {
    const createRes = await app.inject({
      body: { email: "pw-update@test.com", password: "password123" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    const userId = JSON.parse(createRes.body).user.id;

    const res = await app.inject({
      body: { password: "newpassword456" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PATCH",
      url: `/api/users/${userId}`,
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /api/users persists name field", async () => {
    const res = await app.inject({
      body: { email: "extra@test.com", name: "Should Persist", password: "password123" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe("extra@test.com");
    expect(body.user.name).toBe("Should Persist");
  });

  it("POST /api/users returns 400 for duplicate email", async () => {
    const res = await app.inject({
      body: { email: "updated@test.com", password: "password123" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain("already exists");
  });

  it("POST /api/users returns 400 for missing password", async () => {
    const res = await app.inject({
      body: { email: "nopass@test.com" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/users without body returns 400", async () => {
    const res = await app.inject({
      body: {},
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/users with limit and offset pagination", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/users?limit=1&offset=0",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeLessThanOrEqual(1);
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it("rejects PATCH /api/users/:id without auth", async () => {
    const res = await app.inject({
      body: { email: "noauth@test.com" },
      method: "PATCH",
      url: "/api/users/1",
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects DELETE /api/users/:id without auth", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/users/1",
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects POST /api/users without auth", async () => {
    const res = await app.inject({
      body: { email: "noauth@test.com", password: "password123" },
      method: "POST",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(401);
  });
});
