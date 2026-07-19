import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";

function createMockAdapter(): DatabaseAdapter {
  const users = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  const permissions = new Map<string, Record<string, unknown>>();
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
      if (_table === "__cms_permissions") {
        const id = String(permissions.size + 1);
        const record = { id, ...data };
        permissions.set(id, record);
        return record;
      }
      return {};
    },
    createTable: async () => {},
    delete: async (_table: string, id: string) => {
      if (_table === "__cms_roles") return roles.delete(id);
      if (_table === "__cms_users") return users.delete(id);
      return true;
    },
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
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
      if (_table === "__cms_permissions") {
        let all = [...permissions.values()];
        if (options?.where?.roleId) {
          all = all.filter((r) => r.roleId === options.where.roleId);
        }
        return { data: all, total: all.length };
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
      if (_table === "__cms_roles") {
        const existing = roles.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        roles.set(id, updated);
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

describe("Permissions — extra (403 path)", () => {
  let app: FastifyInstance;
  let adapter: DatabaseAdapter;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    adapter = createMockAdapter();
    app = await createApp({ adapter, collections: [], config: testConfig });

    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    adminToken = JSON.parse(loginRes.body).accessToken;

    const registerRes = await app.inject({
      body: { email: "viewer@test.com", password: "password123" },
      method: "POST",
      url: "/api/auth/register",
    });
    const viewerUser = JSON.parse(registerRes.body).user;
    const viewerUserId = viewerUser.id;

    await app.inject({
      body: { role: "viewer" },
      headers: { authorization: `Bearer ${adminToken}` },
      method: "PATCH",
      url: `/api/users/${viewerUserId}`,
    });

    const viewerLoginRes = await app.inject({
      body: { email: "viewer@test.com", password: "password123" },
      method: "POST",
      url: "/api/auth/login",
    });
    viewerToken = JSON.parse(viewerLoginRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 403 when viewer tries to create a role (manage:roles)", async () => {
    const res = await app.inject({
      body: { description: "Should fail", name: "new-role", permissions: [] },
      headers: { authorization: `Bearer ${viewerToken}` },
      method: "POST",
      url: "/api/roles",
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 when viewer tries to update a role (manage:roles)", async () => {
    const res = await app.inject({
      body: { name: "hacked-role" },
      headers: { authorization: `Bearer ${viewerToken}` },
      method: "PATCH",
      url: "/api/roles/1",
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 when viewer tries to delete a role (manage:roles)", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${viewerToken}` },
      method: "DELETE",
      url: "/api/roles/1",
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 when viewer tries to create a user (create:users)", async () => {
    const res = await app.inject({
      body: { email: "new@test.com", password: "password123" },
      headers: { authorization: `Bearer ${viewerToken}` },
      method: "POST",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("Forbidden");
  });

  it("allows viewer to read roles (read:roles implied by read:*)", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${viewerToken}` },
      method: "GET",
      url: "/api/roles",
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns 401 when request has no user role (no auth header)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(401);
  });

  it("allows admin to create a role (manage:roles)", async () => {
    const res = await app.inject({
      body: { description: "Admin can", name: "admin-created", permissions: [] },
      headers: { authorization: `Bearer ${adminToken}` },
      method: "POST",
      url: "/api/roles",
    });
    expect(res.statusCode).toBe(201);
  });
});
