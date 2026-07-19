import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";

function createMockAdapter(): DatabaseAdapter {
  const users = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  const webhooks: Array<Record<string, unknown>> = [];
  let nextUserId = 1;
  let nextRoleId = 1;
  let nextRowId = 1;
  let failNextPostUpdateSelect = false;
  let lastWasUpdate = false;

  return {
    _testFlags: {
      setFailNextPostUpdateSelect(value: boolean) {
        failNextPostUpdateSelect = value;
      },
    },
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
    raw: async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO __cms_webhooks")) {
        const id = String(nextRowId++);
        const entry = {
          collection: params?.[3] ?? "*",
          created_at: params?.[5] ?? new Date().toISOString(),
          enabled: 1,
          events: params?.[2] ?? "[]",
          last_delivered_at: null,
          last_error: "",
          last_status: null,
          last_success: 0,
          name: params?.[0] ?? "",
          rowid: Number(id),
          secret: params?.[4] ?? "",
          updated_at: params?.[6] ?? new Date().toISOString(),
          url: params?.[1] ?? "",
        };
        webhooks.push(entry);
        return [];
      }
      if (sql.includes("SELECT") && sql.includes("__cms_webhooks")) {
        if (lastWasUpdate && failNextPostUpdateSelect) {
          lastWasUpdate = false;
          failNextPostUpdateSelect = false;
          return [];
        }
        lastWasUpdate = false;
        if (sql.includes("WHERE rowid")) {
          const targetId = Number(params?.[0]);
          return webhooks.filter((w) => Number(w.rowid) === targetId);
        }
        return [...webhooks].reverse();
      }
      if (sql.includes("UPDATE __cms_webhooks")) {
        const targetId = Number(params?.[params.length - 1]);
        const idx = webhooks.findIndex((w) => Number(w.rowid) === targetId);
        if (idx !== -1) {
          const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/);
          if (setMatch) {
            const setParts = setMatch[1].split(",").map((s) => s.trim().split(" = ")[0]);
            for (let i = 0; i < setParts.length; i++) {
              const col = setParts[i];
              if (col && params?.[i] !== undefined) {
                webhooks[idx][col] = params[i];
              }
            }
          }
        }
        lastWasUpdate = true;
        return [];
      }
      if (sql.includes("DELETE FROM __cms_webhooks")) {
        const targetId = Number(params?.[0]);
        const idx = webhooks.findIndex((w) => Number(w.rowid) === targetId);
        if (idx !== -1) webhooks.splice(idx, 1);
        return [];
      }
      return [];
    },
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async () => null,
  } as DatabaseAdapter & {
    _testFlags: {
      setFailNextPostUpdateSelect(value: boolean): void;
    };
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

describe("Webhook Routes — extra", () => {
  let app: FastifyInstance;
  let authToken: string;
  let adapter: ReturnType<typeof createMockAdapter> & {
    _testFlags: { setFailNextPostUpdateSelect(value: boolean): void };
  };

  beforeAll(async () => {
    adapter = createMockAdapter() as ReturnType<typeof createMockAdapter> & {
      _testFlags: { setFailNextPostUpdateSelect(value: boolean): void };
    };
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

  describe("PUT /api/settings/webhooks/:id — secret field", () => {
    it("updates a webhook with a secret", async () => {
      const createRes = await app.inject({
        body: {
          collection: "posts",
          events: ["entry.create"],
          name: "secret-hook",
          url: "https://example.com/secret",
        },
        headers: auth(),
        method: "POST",
        url: "/api/settings/webhooks",
      });
      const webhookId = JSON.parse(createRes.body).id;

      const res = await app.inject({
        body: { secret: "my-secret-token" },
        headers: auth(),
        method: "PUT",
        url: `/api/settings/webhooks/${webhookId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.id).toBe(webhookId);
    });

    it("updates a webhook with a trimmed secret", async () => {
      const createRes = await app.inject({
        body: {
          collection: "posts",
          events: ["entry.create"],
          name: "trim-secret-hook",
          url: "https://example.com/trim",
        },
        headers: auth(),
        method: "POST",
        url: "/api/settings/webhooks",
      });
      const webhookId = JSON.parse(createRes.body).id;

      const res = await app.inject({
        body: { secret: "  trimmed-secret  " },
        headers: auth(),
        method: "PUT",
        url: `/api/settings/webhooks/${webhookId}`,
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("PUT /api/settings/webhooks/:id — 500 on failed retrieval", () => {
    it("returns 500 when updated webhook cannot be retrieved", async () => {
      const createRes = await app.inject({
        body: {
          collection: "posts",
          events: ["entry.create"],
          name: "fail-retrieve-hook",
          url: "https://example.com/fail",
        },
        headers: auth(),
        method: "POST",
        url: "/api/settings/webhooks",
      });
      const webhookId = JSON.parse(createRes.body).id;

      adapter._testFlags.setFailNextPostUpdateSelect(true);

      const res = await app.inject({
        body: { name: "updated-name" },
        headers: auth(),
        method: "PUT",
        url: `/api/settings/webhooks/${webhookId}`,
      });
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).error).toBe("Failed to retrieve updated webhook");
    });
  });
});
