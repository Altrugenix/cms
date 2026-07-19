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

describe("Users Routes — extra", () => {
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

  describe("POST /api/users — create user", () => {
    it("returns 400 when email is missing", async () => {
      const res = await app.inject({
        body: { password: "password123" },
        headers: auth(),
        method: "POST",
        url: "/api/users",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain("required");
    });

    it("returns 400 when password is missing", async () => {
      const res = await app.inject({
        body: { email: "new@test.com" },
        headers: auth(),
        method: "POST",
        url: "/api/users",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain("required");
    });

    it("returns 400 when both fields are missing", async () => {
      const res = await app.inject({
        body: {},
        headers: auth(),
        method: "POST",
        url: "/api/users",
      });
      expect(res.statusCode).toBe(400);
    });

    it("creates a new user with valid data", async () => {
      const res = await app.inject({
        body: { email: "created@test.com", password: "password123" },
        headers: auth(),
        method: "POST",
        url: "/api/users",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body).toBeDefined();
    });

    it("returns 400 for duplicate email", async () => {
      const res = await app.inject({
        body: { email: "created@test.com", password: "password123" },
        headers: auth(),
        method: "POST",
        url: "/api/users",
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("PATCH /api/users/:id — self role change prevention", () => {
    it("cannot change your own role", async () => {
      const adminId = "1";
      const res = await app.inject({
        body: { role: "admin" },
        headers: auth(),
        method: "PATCH",
        url: `/api/users/${adminId}`,
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe("Cannot change your own role");
    });

    it("can change own email", async () => {
      const adminId = "1";
      const res = await app.inject({
        body: { email: "admin-new@test.com" },
        headers: auth(),
        method: "PATCH",
        url: `/api/users/${adminId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).email).toBe("admin-new@test.com");
    });

    it("can change another user's role", async () => {
      const createRes = await app.inject({
        body: { email: "role-change@test.com", password: "password123" },
        method: "POST",
        url: "/api/auth/register",
      });
      const userId = JSON.parse(createRes.body).user.id;

      const res = await app.inject({
        body: { role: "editor" },
        headers: auth(),
        method: "PATCH",
        url: `/api/users/${userId}`,
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).role).toBe("editor");
    });
  });

  describe("GET /api/users — pagination", () => {
    it("returns paginated results with limit", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/users?limit=1",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeLessThanOrEqual(1);
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("returns paginated results with offset", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/users?limit=1&offset=1",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeLessThanOrEqual(1);
    });

    it("returns empty data when offset exceeds total", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/users?limit=1&offset=100",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(0);
    });
  });

  describe("DELETE /api/users/:id — edge cases", () => {
    it("returns 404 for already deleted user", async () => {
      const createRes = await app.inject({
        body: { email: "delete-twice@test.com", password: "password123" },
        method: "POST",
        url: "/api/auth/register",
      });
      const userId = JSON.parse(createRes.body).user.id;

      await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/users/${userId}`,
      });

      const secondDelete = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/users/${userId}`,
      });
      expect(secondDelete.statusCode).toBe(404);
    });
  });
});
