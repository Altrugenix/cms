import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";

function createMockAdapter(): DatabaseAdapter {
  const roles = new Map<string, Record<string, unknown>>();
  const users = new Map<string, Record<string, unknown>>();
  const permissions = new Map<string, Record<string, unknown>>();
  let nextRoleId = 1;
  let nextUserId = 1;

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
      if (_table === "__cms_roles") return roles.get(id) ?? null;
      if (_table === "__cms_users") return users.get(id) ?? null;
      return null;
    },
    getExecutedMigrations: async () => [],
    raw: async () => [],
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
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

describe("Roles Routes — extra", () => {
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

  describe("POST /api/roles — error handling", () => {
    it("returns 400 for duplicate role name", async () => {
      const res = await app.inject({
        body: { description: "Dup admin", name: "admin", permissions: [] },
        headers: auth(),
        method: "POST",
        url: "/api/roles",
      });
      expect(res.statusCode).toBe(400);
    });

    it("creates and returns role with permissions", async () => {
      const res = await app.inject({
        body: {
          description: "With perms",
          name: "with-perms",
          permissions: [
            { action: "read", resource: "posts" },
            { action: "create", resource: "posts" },
          ],
        },
        headers: auth(),
        method: "POST",
        url: "/api/roles",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("with-perms");
    });

    it("creates role with empty permissions array", async () => {
      const res = await app.inject({
        body: { description: "Empty perms", name: "empty-perms", permissions: [] },
        headers: auth(),
        method: "POST",
        url: "/api/roles",
      });
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).name).toBe("empty-perms");
    });
  });

  describe("PATCH /api/roles/:id — update different fields", () => {
    it("updates only the description", async () => {
      const createRes = await app.inject({
        body: { description: "Original desc", name: "desc-only-role", permissions: [] },
        headers: auth(),
        method: "POST",
        url: "/api/roles",
      });
      const roleId = JSON.parse(createRes.body).id;

      const res = await app.inject({
        body: { description: "Updated desc" },
        headers: auth(),
        method: "PATCH",
        url: `/api/roles/${roleId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.description).toBe("Updated desc");
      expect(body.name).toBe("desc-only-role");
    });

    it("updates permissions", async () => {
      const createRes = await app.inject({
        body: { description: "Perm role", name: "perm-role", permissions: [] },
        headers: auth(),
        method: "POST",
        url: "/api/roles",
      });
      const roleId = JSON.parse(createRes.body).id;

      const res = await app.inject({
        body: {
          permissions: [
            { action: "read", resource: "pages" },
            { action: "update", resource: "pages" },
          ],
        },
        headers: auth(),
        method: "PATCH",
        url: `/api/roles/${roleId}`,
      });
      expect(res.statusCode).toBe(200);
    });

    it("updates name, description, and permissions together", async () => {
      const createRes = await app.inject({
        body: {
          description: "Old description",
          name: "full-update-role",
          permissions: [],
        },
        headers: auth(),
        method: "POST",
        url: "/api/roles",
      });
      const roleId = JSON.parse(createRes.body).id;

      const res = await app.inject({
        body: {
          description: "New description",
          name: "full-update-role-v2",
          permissions: [{ action: "manage", resource: "all" }],
        },
        headers: auth(),
        method: "PATCH",
        url: `/api/roles/${roleId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("full-update-role-v2");
      expect(body.description).toBe("New description");
    });

    it("returns 404 when updating nonexistent role", async () => {
      const res = await app.inject({
        body: { name: "ghost" },
        headers: auth(),
        method: "PATCH",
        url: "/api/roles/99999",
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /api/roles — pagination", () => {
    it("returns paginated roles with limit", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/roles?limit=2",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.total).toBeGreaterThanOrEqual(3);
    });

    it("returns paginated roles with offset", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/roles?limit=2&offset=1",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe("GET /api/roles/:id — specific role", () => {
    it("returns seeded admin role", async () => {
      const listRes = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/roles",
      });
      const roles = JSON.parse(listRes.body).data;
      const adminRole = roles.find((r: Record<string, unknown>) => r.name === "admin");
      expect(adminRole).toBeDefined();

      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/roles/${adminRole.id}`,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).name).toBe("admin");
    });
  });

  describe("DELETE /api/roles/:id — edge cases", () => {
    it("returns 404 when deleting already deleted role", async () => {
      const createRes = await app.inject({
        body: { description: "Double delete", name: "double-delete", permissions: [] },
        headers: auth(),
        method: "POST",
        url: "/api/roles",
      });
      const roleId = JSON.parse(createRes.body).id;

      await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/roles/${roleId}`,
      });

      const secondDelete = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/roles/${roleId}`,
      });
      expect(secondDelete.statusCode).toBe(404);
    });
  });
});
