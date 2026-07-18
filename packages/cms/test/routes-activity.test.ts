import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";
import { recordActivity } from "../src/server/lib/activity.js";

function createMockAdapter(): DatabaseAdapter {
  const activity: Array<Record<string, unknown>> = [];
  return {
    connect: async () => {},
    create: async () => ({}),
    createTable: async () => {},
    delete: async () => true,
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (_table, options) => {
      if (_table === "__cms_activity") {
        const filtered = options?.where?.email ? [] : [...activity].reverse();
        return { data: filtered.slice(0, options?.limit ?? 100), total: filtered.length };
      }
      return { data: [], total: 0 };
    },
    findOne: async () => null,
    getExecutedMigrations: async () => [],
    raw: async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO __cms_activity")) {
        const entry = {
          action: params?.[0] ?? "",
          collection: params?.[1] ?? "",
          createdAt: new Date().toISOString(),
          documentId: params?.[2] ?? null,
          id: String(activity.length + 1),
          label: params?.[3] ?? "",
        };
        activity.push(entry);
        return [];
      }
      if (sql.includes("SELECT")) {
        return [...activity].reverse().slice(0, (params?.[0] as number) ?? 10);
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

describe("Activity Route", () => {
  let app: FastifyInstance;
  let adapter: DatabaseAdapter;

  beforeAll(async () => {
    adapter = createMockAdapter();
    app = await createApp({ adapter, collections: [], config: testConfig });
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns empty activity when no entries exist", async () => {
    const res = await app.inject({ method: "GET", url: "/api/activity" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns recorded activity entries", async () => {
    await recordActivity(adapter, {
      action: "create",
      collection: "posts",
      documentId: "1",
      label: "Created post",
    });
    const res = await app.inject({ method: "GET", url: "/api/activity" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.data[0].action).toBe("create");
    expect(body.data[0].collection).toBe("posts");
  });

  it("returns multiple entries in reverse chronological order", async () => {
    await recordActivity(adapter, { action: "update", collection: "posts", documentId: "1" });
    await recordActivity(adapter, { action: "delete", collection: "pages", documentId: "2" });
    const res = await app.inject({ method: "GET", url: "/api/activity" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(3);
    expect(body.data[0].action).toBe("delete");
  });

  it("limits results to 10 entries by default", async () => {
    for (let i = 0; i < 15; i++) {
      await recordActivity(adapter, {
        action: "create",
        collection: "test",
        documentId: String(i),
      });
    }
    const res = await app.inject({ method: "GET", url: "/api/activity" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeLessThanOrEqual(10);
  });
});
