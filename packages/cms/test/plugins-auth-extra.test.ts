import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { JwtService } from "@arche-cms/auth";
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

const jwtService = new JwtService(testConfig.auth);

async function generateTokenWithSub(sub: string): Promise<string> {
  return await jwtService.generateAccessToken({
    email: "nonexistent@example.com",
    role: "admin",
    sub,
  });
}

describe("Auth Plugin — extra (auth/me edge cases)", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = await createApp({ adapter: createMockAdapter(), collections: [], config: testConfig });
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

  describe("GET /api/auth/me — 404 when user not found", () => {
    it("returns 404 when JWT sub does not match any user", async () => {
      const fakeToken = await generateTokenWithSub("99999");
      const res = await app.inject({
        headers: { authorization: `Bearer ${fakeToken}` },
        method: "GET",
        url: "/api/auth/me",
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("User not found");
    });

    it("returns 404 when JWT sub is a non-existent ID string", async () => {
      const fakeToken = await generateTokenWithSub("nonexistent-id-abc");
      const res = await app.inject({
        headers: { authorization: `Bearer ${fakeToken}` },
        method: "GET",
        url: "/api/auth/me",
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe("User not found");
    });
  });

  describe("GET /api/auth/me — 200 for valid user", () => {
    it("returns the authenticated user profile", async () => {
      const res = await app.inject({
        headers: { authorization: `Bearer ${authToken}` },
        method: "GET",
        url: "/api/auth/me",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.email).toBe("admin@arche-cms.com");
      expect(body.role).toBe("admin");
    });
  });

  describe("GET /api/auth/me — 401 for missing/invalid token", () => {
    it("returns 401 for missing authorization header", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/me",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 401 for invalid token", async () => {
      const res = await app.inject({
        headers: { authorization: "Bearer invalid-token-value" },
        method: "GET",
        url: "/api/auth/me",
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
