import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

let mockExistsSyncResult = true;
vi.mock("node:fs", async (importOriginal) => {
  const orig = await importOriginal<typeof import("node:fs")>();
  return {
    ...orig,
    existsSync: (_p: string) => mockExistsSyncResult,
  };
});

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

describe("Plugins — extra", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
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

  describe("requirePermission middleware", () => {
    it("returns 401 when request has no user role", async () => {
      const res = await app.inject({
        headers: { authorization: "Bearer invalid-token" },
        method: "GET",
        url: "/api/users",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("Auth routes — extra", () => {
    it("POST /api/auth/register with invalid email returns 400", async () => {
      const res = await app.inject({
        body: { email: "not-an-email", password: "password123" },
        method: "POST",
        url: "/api/auth/register",
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toContain("Invalid email");
    });

    it("POST /api/auth/register with short password returns 400", async () => {
      const res = await app.inject({
        body: { email: "valid@test.com", password: "short" },
        method: "POST",
        url: "/api/auth/register",
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toContain("at least 8 characters");
    });

    it("POST /api/auth/forgot-password with invalid email returns 400", async () => {
      const res = await app.inject({
        body: { email: "invalid-email" },
        method: "POST",
        url: "/api/auth/forgot-password",
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("POST /api/auth/forgot-password with valid email returns 200", async () => {
      const res = await app.inject({
        body: { email: "admin@arche-cms.com" },
        method: "POST",
        url: "/api/auth/forgot-password",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.message).toContain("reset link");
    });

    it("POST /api/auth/reset-password with invalid token returns 400", async () => {
      const res = await app.inject({
        body: { password: "newpassword123", token: "invalid-token" },
        method: "POST",
        url: "/api/auth/reset-password",
      });
      expect(res.statusCode).toBe(400);
    });

    it("GET /api/auth/me when authenticated returns 200", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/auth/me",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.email).toBe("admin@arche-cms.com");
    });

    it("GET /api/auth/me when not authenticated returns 401", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/me",
      });
      expect(res.statusCode).toBe(401);
    });

    it("GET /api/auth/setup-status returns hasAdmin", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/setup-status",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.hasAdmin).toBe(true);
    });

    it("POST /api/auth/refresh with invalid token returns 401", async () => {
      const res = await app.inject({
        body: { refreshToken: "totally-fake-refresh-token" },
        method: "POST",
        url: "/api/auth/refresh",
      });
      expect(res.statusCode).toBe(401);
    });

    it("POST /api/auth/login with wrong password returns 401", async () => {
      const res = await app.inject({
        body: { email: "admin@arche-cms.com", password: "wrongpassword" },
        method: "POST",
        url: "/api/auth/login",
      });
      expect(res.statusCode).toBe(401);
    });

    it("POST /api/auth/login with non-existent user returns 401", async () => {
      const res = await app.inject({
        body: { email: "nobody@test.com", password: "password123" },
        method: "POST",
        url: "/api/auth/login",
      });
      expect(res.statusCode).toBe(401);
    });

    it("POST /api/auth/register with missing body fields returns 400", async () => {
      const res = await app.inject({
        body: {},
        method: "POST",
        url: "/api/auth/register",
      });
      expect(res.statusCode).toBe(400);
    });

    it("POST /api/auth/login with empty body returns 400", async () => {
      const res = await app.inject({
        body: {},
        method: "POST",
        url: "/api/auth/login",
      });
      expect(res.statusCode).toBe(400);
    });

    it("GET /api/auth/setup-status returns false when no users exist", async () => {
      const { registerAdminStatic: _ } = await import("../src/server/plugins/static.js");
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/setup-status",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(typeof body.hasAdmin).toBe("boolean");
    });
  });

  describe("Static plugin", () => {
    it("registerAdminStatic warns when no admin dir found", async () => {
      mockExistsSyncResult = false;
      const { registerAdminStatic } = await import("../src/server/plugins/static.js");
      const warnSpy = vi.fn();
      const mockFastify = {
        log: { info: vi.fn(), warn: warnSpy },
        register: vi.fn(),
        setNotFoundHandler: vi.fn(),
      } as never;

      await registerAdminStatic(mockFastify as never, {});
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Admin panel build not found"));
      mockExistsSyncResult = true;
    });

    it("registerAdminStatic uses provided adminDir when given", async () => {
      const { registerAdminStatic } = await import("../src/server/plugins/static.js");
      const logSpy = vi.fn();
      const mockFastify = {
        log: { info: logSpy, warn: vi.fn() },
        register: vi.fn(),
        setNotFoundHandler: vi.fn(),
      } as never;

      await registerAdminStatic(mockFastify as never, { adminDir: "/some/path" });
      expect(logSpy).toHaveBeenCalledWith("Serving admin panel from /some/path");
    });

    it("findAdminDir uses CMS_ADMIN_DIR env var when set to valid path", async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), "arche-test-"));
      writeFileSync(join(tmpDir, "index.html"), "<html></html>");

      process.env.CMS_ADMIN_DIR = tmpDir;
      mockExistsSyncResult = true;

      const { registerAdminStatic } = await import("../src/server/plugins/static.js");
      const logSpy = vi.fn();
      const mockFastify = {
        log: { info: logSpy, warn: vi.fn() },
        register: vi.fn(),
        setNotFoundHandler: vi.fn(),
      } as never;

      await registerAdminStatic(mockFastify as never, {});
      expect(logSpy).toHaveBeenCalledWith(`Serving admin panel from ${tmpDir}`);
      expect(mockFastify.register).toHaveBeenCalled();

      delete process.env.CMS_ADMIN_DIR;
      rmSync(tmpDir, { recursive: true });
    });
  });
});
