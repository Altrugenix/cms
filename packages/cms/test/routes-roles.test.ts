import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";
import { createApp } from "../src/server/app.js";
import type { ServerConfig } from "../src/server/config.js";

function createMockAdapter(): DatabaseAdapter {
  const roles = new Map<string, Record<string, unknown>>();
  const users = new Map<string, Record<string, unknown>>();
  let nextRoleId = 1;
  let nextUserId = 1;

  return {
    findOne: async (_table: string, id: string) => {
      if (_table === "__cms_roles") return roles.get(id) ?? null;
      if (_table === "__cms_users") return users.get(id) ?? null;
      return null;
    },
    findMany: async (_table: string, options) => {
      if (_table === "__cms_roles") {
        let all = [...roles.values()];
        if (options?.where?.name) {
          all = all.filter((r) => r.name === options.where.name);
        }
        return { data: all.slice(0, options?.limit ?? 100), total: all.length };
      }
      if (_table === "__cms_users") {
        let all = [...users.values()];
        if (options?.where?.email) {
          all = all.filter((r) => r.email === options.where.email);
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
      if (_table === "__cms_roles") {
        const existing = roles.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        roles.set(id, updated);
        return updated;
      }
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
      if (_table === "__cms_roles") return roles.delete(id);
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

describe("Roles Routes", () => {
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

  it("GET /api/roles returns default seeded roles", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/roles",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBeGreaterThanOrEqual(3);
    const names = body.data.map((r: Record<string, unknown>) => r.name).sort();
    expect(names).toContain("admin");
    expect(names).toContain("editor");
    expect(names).toContain("viewer");
  });

  it("GET /api/roles/:id returns 404 for unknown role", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/roles/999",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("Role not found");
  });

  it("POST /api/roles creates a new role", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/roles",
      headers: { authorization: `Bearer ${authToken}` },
      body: {
        name: "custom-editor",
        description: "Custom editor",
        permissions: [{ action: "read", resource: "posts" }],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("custom-editor");
  });

  it("POST /api/roles returns 400 for duplicate name", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/roles",
      headers: { authorization: `Bearer ${authToken}` },
      body: { name: "admin", description: "Duplicate", permissions: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/roles/:id returns newly created role", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/roles",
      headers: { authorization: `Bearer ${authToken}` },
      body: { name: "another-role", description: "New role", permissions: [] },
    });
    const newId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: "GET",
      url: `/api/roles/${newId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("another-role");
  });

  it("PATCH /api/roles/:id updates a role", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/roles",
      headers: { authorization: `Bearer ${authToken}` },
      body: { name: "updatable-role", description: "Will be updated", permissions: [] },
    });
    const newId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: "PATCH",
      url: `/api/roles/${newId}`,
      headers: { authorization: `Bearer ${authToken}` },
      body: { name: "updated-role" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("updated-role");
  });

  it("PATCH /api/roles/:id returns 404 for unknown role", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/roles/999",
      headers: { authorization: `Bearer ${authToken}` },
      body: { name: "ghost" },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("Role not found");
  });

  it("DELETE /api/roles/:id deletes a new role", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/roles",
      headers: { authorization: `Bearer ${authToken}` },
      body: { name: "delete-me-role", description: "Temporary", permissions: [] },
    });
    const roleId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      method: "DELETE",
      url: `/api/roles/${roleId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).message).toBe("Role deleted");
  });

  it("DELETE /api/roles/:id returns 404 for unknown role", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/roles/999999",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("Role not found");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/api/roles" });
    expect(res.statusCode).toBe(401);
  });
});
