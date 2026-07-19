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

describe("Webhook Routes", () => {
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

  it("returns empty list when no webhooks exist", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/settings/webhooks",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("creates a new webhook", async () => {
    const res = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "my-webhook",
        url: "https://example.com/hook",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("my-webhook");
    expect(body.url).toBe("https://example.com/hook");
    expect(body.events).toEqual(["entry.create"]);
    expect(body.enabled).toBe(true);
    expect(body.id).toBeDefined();
  });

  it("returns 400 when required fields are missing (schema validation)", async () => {
    const res = await app.inject({
      body: {},
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBeDefined();
  });

  it("returns 400 when webhook name is empty string", async () => {
    const res = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "   ",
        url: "https://example.com/hook",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("Webhook name is required");
  });

  it("returns 400 when URL is empty string", async () => {
    const res = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "hook-empty-url",
        url: "   ",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("URL is required");
  });

  it("returns 400 when events array is empty", async () => {
    const res = await app.inject({
      body: {
        collection: "posts",
        events: [],
        name: "hook-no-events",
        url: "https://example.com/hook",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("At least one event is required");
  });

  it("lists created webhooks", async () => {
    await app.inject({
      body: {
        collection: "pages",
        events: ["entry.update"],
        name: "list-test-hook",
        url: "https://example.com/list",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });

    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/settings/webhooks",
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
      url: "/api/settings/webhooks?limit=1&offset=0",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
    expect(body.total).toBeGreaterThanOrEqual(2);
  });

  it("gets a single webhook by ID", async () => {
    const createRes = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "single-hook",
        url: "https://example.com/single",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    const webhookId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: `/api/settings/webhooks/${webhookId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("single-hook");
    expect(body.url).toBe("https://example.com/single");
  });

  it("returns 404 for non-existent webhook", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/settings/webhooks/999999",
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("Webhook not found");
  });

  it("updates a webhook", async () => {
    const createRes = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "update-me",
        url: "https://example.com/original",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    const webhookId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      body: { name: "updated-hook", url: "https://example.com/updated" },
      headers: auth(),
      method: "PUT",
      url: `/api/settings/webhooks/${webhookId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("updated-hook");
    expect(body.url).toBe("https://example.com/updated");
  });

  it("returns 404 when updating non-existent webhook", async () => {
    const res = await app.inject({
      body: { name: "ghost" },
      headers: auth(),
      method: "PUT",
      url: "/api/settings/webhooks/999999",
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("Webhook not found");
  });

  it("returns 400 when update has empty name", async () => {
    const createRes = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "will-be-empty",
        url: "https://example.com/empty",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    const webhookId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      body: { name: "   " },
      headers: auth(),
      method: "PUT",
      url: `/api/settings/webhooks/${webhookId}`,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("Name cannot be empty");
  });

  it("returns 400 when update has empty URL (schema rejects invalid format)", async () => {
    const createRes = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "url-check",
        url: "https://example.com/url",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    const webhookId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      body: { url: "   " },
      headers: auth(),
      method: "PUT",
      url: `/api/settings/webhooks/${webhookId}`,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBeDefined();
  });

  it("returns 400 when update has empty events array", async () => {
    const createRes = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "events-check",
        url: "https://example.com/events",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    const webhookId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      body: { events: [] },
      headers: auth(),
      method: "PUT",
      url: `/api/settings/webhooks/${webhookId}`,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("At least one event is required");
  });

  it("returns 400 when no fields are provided for update", async () => {
    const createRes = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "no-fields",
        url: "https://example.com/no-fields",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    const webhookId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      body: {},
      headers: auth(),
      method: "PUT",
      url: `/api/settings/webhooks/${webhookId}`,
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("No fields to update");
  });

  it("deletes a webhook", async () => {
    const createRes = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "delete-me",
        url: "https://example.com/delete",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    const webhookId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      headers: auth(),
      method: "DELETE",
      url: `/api/settings/webhooks/${webhookId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).message).toBe("Webhook deleted");
  });

  it("returns 404 when deleting non-existent webhook", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "DELETE",
      url: "/api/settings/webhooks/999999",
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe("Webhook not found");
  });

  it("toggles webhook enabled status", async () => {
    const createRes = await app.inject({
      body: {
        collection: "posts",
        events: ["entry.create"],
        name: "toggle-hook",
        url: "https://example.com/toggle",
      },
      headers: auth(),
      method: "POST",
      url: "/api/settings/webhooks",
    });
    const webhookId = JSON.parse(createRes.body).id;

    const res = await app.inject({
      body: { enabled: false },
      headers: auth(),
      method: "PUT",
      url: `/api/settings/webhooks/${webhookId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.enabled).toBe(false);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/settings/webhooks",
    });
    expect(res.statusCode).toBe(401);
  });
});
