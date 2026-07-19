import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";

function createMockAdapter(): DatabaseAdapter {
  const users = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  const apiTokens: Array<Record<string, unknown>> = [];
  let nextUserId = 1;
  let nextRoleId = 1;
  let nextRowId = 1;

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
    getExistingSchema: async () => ({ tables: {} }),
    raw: async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO __cms_api_tokens")) {
        const id = String(nextRowId++);
        const entry = {
          created_at: params?.[6] ?? new Date().toISOString(),
          created_by: params?.[5] ?? "unknown",
          description: params?.[3] ?? "",
          last_four: params?.[2] ?? "",
          last_used_at: null,
          name: params?.[0] ?? "",
          role: params?.[4] ?? "admin",
          rowid: Number(id),
          token_hash: params?.[1] ?? "",
        };
        apiTokens.push(entry);
        return [];
      }
      if (sql.includes("SELECT") && sql.includes("__cms_api_tokens")) {
        if (sql.includes("WHERE token_hash")) {
          const match = apiTokens.filter((t) => t.token_hash === params?.[0]);
          return match;
        }
        if (sql.includes("WHERE rowid")) {
          const match = apiTokens.filter((t) => t.rowid === params?.[0]);
          return match;
        }
        return [...apiTokens].reverse();
      }
      if (sql.includes("UPDATE __cms_api_tokens") && sql.includes("last_used_at")) {
        return [];
      }
      if (sql.includes("DELETE FROM __cms_api_tokens")) {
        const idx = apiTokens.findIndex((t) => t.rowid === params?.[0]);
        if (idx !== -1) apiTokens.splice(idx, 1);
        return [];
      }
      return [];
    },
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async () => null,
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

describe("API Token Routes", () => {
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

  it("returns empty list when no tokens exist", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/settings/api-tokens",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("creates a new API token", async () => {
    const res = await app.inject({
      body: { description: "Test token", name: "my-token", role: "admin" },
      headers: auth(),
      method: "POST",
      url: "/api/settings/api-tokens",
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.rawToken).toBeDefined();
    expect(body.rawToken).toMatch(/^cms_/);
    expect(body.token.name).toBe("my-token");
    expect(body.token.lastFour).toBeDefined();
    expect(body.token.role).toBe("admin");
  });

  it("returns 400 when token name is missing", async () => {
    const res = await app.inject({
      body: { description: "No name" },
      headers: auth(),
      method: "POST",
      url: "/api/settings/api-tokens",
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBeDefined();
  });

  it("returns 400 when token name is empty string", async () => {
    const res = await app.inject({
      body: { name: "   " },
      headers: auth(),
      method: "POST",
      url: "/api/settings/api-tokens",
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("Token name is required");
  });

  it("lists created tokens", async () => {
    await app.inject({
      body: { name: "list-test-token" },
      headers: auth(),
      method: "POST",
      url: "/api/settings/api-tokens",
    });

    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/settings/api-tokens",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("supports pagination with limit and offset", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/settings/api-tokens?limit=1&offset=0",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
    expect(body.total).toBeGreaterThanOrEqual(2);
  });

  it("revokes an existing token", async () => {
    const createRes = await app.inject({
      body: { name: "revoke-me" },
      headers: auth(),
      method: "POST",
      url: "/api/settings/api-tokens",
    });
    const tokenId = JSON.parse(createRes.body).token.id;

    const res = await app.inject({
      headers: auth(),
      method: "DELETE",
      url: `/api/settings/api-tokens/${tokenId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).message).toBe("Token revoked");
  });

  it("returns 404 when revoking non-existent token", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "DELETE",
      url: "/api/settings/api-tokens/999999",
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("Token not found");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/settings/api-tokens",
    });
    expect(res.statusCode).toBe(401);
  });
});
