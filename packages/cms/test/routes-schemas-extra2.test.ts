import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

let mockWriteFileError: Error | null = null;
let mockUnlinkError: Error | null = null;

vi.mock("node:fs/promises", async (importOriginal) => {
  const orig = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...orig,
    unlink: async (...args: Parameters<typeof orig.unlink>) => {
      if (mockUnlinkError) throw mockUnlinkError;
      return orig.unlink(...args);
    },
    writeFile: async (...args: Parameters<typeof orig.writeFile>) => {
      if (mockWriteFileError) throw mockWriteFileError;
      return orig.writeFile(...args);
    },
  };
});

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";

function createMockAdapter(): DatabaseAdapter {
  const data = new Map<string, Map<string, Record<string, unknown>>>();
  const users = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  let nextUserId = 1;
  let nextRoleId = 1;

  function getTable(table: string): Map<string, Record<string, unknown>> {
    if (!data.has(table)) {
      data.set(table, new Map());
    }
    return data.get(table) ?? new Map();
  }

  return {
    connect: async () => {},
    create: async (_table: string, record: Record<string, unknown>) => {
      if (_table === "__cms_users") {
        const id = String(nextUserId++);
        const entry = { id, ...record };
        users.set(id, entry);
        return entry;
      }
      if (_table === "__cms_roles") {
        const id = String(nextRoleId++);
        const entry = { id, ...record };
        roles.set(id, entry);
        return entry;
      }
      const table = getTable(_table);
      const nextId = String(table.size + 1);
      const entry = { id: nextId, ...record };
      table.set(nextId, entry);
      return entry;
    },
    createTable: async () => {},
    delete: async (_table: string, id: string) => {
      return getTable(_table).delete(id);
    },
    deleteMany: async (_table: string, ids: string[]) => {
      const table = getTable(_table);
      let count = 0;
      for (const id of ids) {
        if (table.delete(id)) count++;
      }
      return count;
    },
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (_table: string, options?) => {
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
      const table = getTable(_table);
      const all = [...table.values()];
      return { data: all.slice(0, options?.limit ?? 100), total: all.length };
    },
    findOne: async (_table: string, id: string) => {
      if (_table === "__cms_users") return users.get(id) ?? null;
      if (_table === "__cms_roles") return roles.get(id) ?? null;
      return getTable(_table).get(id) ?? null;
    },
    getExecutedMigrations: async () => [],
    getExistingSchema: async () => ({ tables: new Map() }),
    raw: async () => [],
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async (_table: string, id: string, record: Record<string, unknown>) => {
      if (_table === "__cms_users") {
        const existing = users.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...record };
        users.set(id, updated);
        return updated;
      }
      if (_table === "__cms_roles") {
        const existing = roles.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...record };
        roles.set(id, updated);
        return updated;
      }
      const table = getTable(_table);
      const existing = table.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...record };
      table.set(id, updated);
      return updated;
    },
  };
}

const BASE_COLLECTION_CONTENT = [
  'import { defineCollection, text } from "@arche-cms/schema";',
  "export default defineCollection({",
  '  slug: "posts",',
  '  labels: { singular: "Post", plural: "Posts" },',
  "  fields: [",
  '    text("title"),',
  "  ],",
  "});",
].join("\n");

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

describe("Schema Routes Extra 2 — error catch blocks", () => {
  let app: FastifyInstance;
  let authToken: string;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "cms-schema-routes-extra2-"));
    await mkdir(join(tmpDir, "collections"), { recursive: true });
    await writeFile(join(tmpDir, "collections", "posts.ts"), BASE_COLLECTION_CONTENT);

    const config: ServerConfig = {
      ...testConfig,
      schema: { baseDir: tmpDir },
    };
    const adapter = createMockAdapter();
    app = await createApp({ adapter, collections: [], config });

    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;
  });

  afterAll(async () => {
    await app?.close();
    await rm(tmpDir, { force: true, recursive: true });
  });

  const auth = () => ({ authorization: `Bearer ${authToken}` });

  describe("PUT /api/schemas/:type/:slug — catch block", () => {
    it("returns 500 when writeFile throws", async () => {
      mockWriteFileError = new Error("Disk write failure");
      try {
        const res = await app.inject({
          body: {
            fields: [{ name: "title", type: "text" }],
            label: "Post Updated",
          },
          headers: auth(),
          method: "PUT",
          url: "/api/schemas/collection/posts",
        });
        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.body);
        expect(body.error).toBe("Disk write failure");
      } finally {
        mockWriteFileError = null;
      }
    });
  });

  describe("DELETE /api/schemas/:type/:slug — catch block", () => {
    it("returns 500 when unlink throws", async () => {
      mockUnlinkError = new Error("Permission denied");
      try {
        const res = await app.inject({
          headers: auth(),
          method: "DELETE",
          url: "/api/schemas/collection/posts",
        });
        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.body);
        expect(body.error).toBe("Permission denied");
      } finally {
        mockUnlinkError = null;
      }
    });
  });

  describe("POST /api/schemas/:type — catch block", () => {
    it("returns 500 when writeFile throws during create", async () => {
      mockWriteFileError = new Error("IO error during create");
      try {
        const res = await app.inject({
          body: { slug: "new-schema" },
          headers: auth(),
          method: "POST",
          url: "/api/schemas/collection",
        });
        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.body);
        expect(body.error).toBe("IO error during create");
      } finally {
        mockWriteFileError = null;
      }
    });
  });

  describe("DELETE /api/schemas/:type/:slug — non-Error throw", () => {
    it("returns 500 with generic message for non-Error throw", async () => {
      mockUnlinkError = new Error("Unexpected fs error");
      try {
        const res = await app.inject({
          headers: auth(),
          method: "DELETE",
          url: "/api/schemas/collection/posts",
        });
        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.body);
        expect(body.error).toBe("Unexpected fs error");
      } finally {
        mockUnlinkError = null;
      }
    });
  });

  describe("PUT /api/schemas/:type/:slug — non-Error throw", () => {
    it("returns 500 with generic message for non-Error throw during update", async () => {
      mockWriteFileError = new Error("Write failed unexpectedly");
      try {
        const res = await app.inject({
          body: { fields: [{ name: "x", type: "text" }] },
          headers: auth(),
          method: "PUT",
          url: "/api/schemas/collection/posts",
        });
        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.body);
        expect(body.error).toBe("Write failed unexpectedly");
      } finally {
        mockWriteFileError = null;
      }
    });
  });
});
