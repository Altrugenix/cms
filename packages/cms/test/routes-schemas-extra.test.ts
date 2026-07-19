import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

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

describe("Schema Routes Extra", () => {
  let app: FastifyInstance;
  let authToken: string;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "cms-schema-routes-extra-"));
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

  describe("GET /api/schemas", () => {
    it("returns all schemas", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/schemas",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      const postsSchema = body.data.find(
        (s: { slug: string; type: string }) => s.slug === "posts" && s.type === "collection",
      );
      expect(postsSchema).toBeDefined();
    });
  });

  describe("GET /api/schemas/:type/:slug", () => {
    it("returns a specific collection schema", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/schemas/collection/posts",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.slug).toBe("posts");
      expect(body.type).toBe("collection");
      expect(body.label).toBe("Post");
    });

    it("returns 404 for unknown schema", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/schemas/collection/nonexistent",
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("Schema not found");
    });
  });

  describe("POST /api/schemas/:type", () => {
    it("creates a new collection schema", async () => {
      const res = await app.inject({
        body: {
          fields: [{ name: "title", type: "text" }],
          slug: "articles",
        },
        headers: auth(),
        method: "POST",
        url: "/api/schemas/collection",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.message).toBe("Schema created");
      expect(body.slug).toBe("articles");
      expect(body.type).toBe("collection");

      const filePath = join(tmpDir, "collections", "articles.ts");
      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("defineCollection");
      expect(content).toContain("articles");
    });

    it("returns 409 if schema already exists", async () => {
      const res = await app.inject({
        body: { slug: "posts" },
        headers: auth(),
        method: "POST",
        url: "/api/schemas/collection",
      });
      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error).toContain("already exists");
    });

    it("returns 400 for invalid slug format", async () => {
      const res = await app.inject({
        body: { slug: "invalid slug with spaces" },
        headers: auth(),
        method: "POST",
        url: "/api/schemas/collection",
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toContain("slug must be alphanumeric");
    });

    it("returns 400 for slug with special characters", async () => {
      const res = await app.inject({
        body: { slug: "foo/bar" },
        headers: auth(),
        method: "POST",
        url: "/api/schemas/collection",
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for slug with double dots", async () => {
      const res = await app.inject({
        body: { slug: "foo..bar" },
        headers: auth(),
        method: "POST",
        url: "/api/schemas/collection",
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for empty field name", async () => {
      const res = await app.inject({
        body: {
          fields: [{ name: "", type: "text" }],
          slug: "bad-fields",
        },
        headers: auth(),
        method: "POST",
        url: "/api/schemas/collection",
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toContain("empty name");
    });

    it("returns 400 for invalid type", async () => {
      const res = await app.inject({
        body: { slug: "test" },
        headers: auth(),
        method: "POST",
        url: "/api/schemas/invalid",
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when slug is missing", async () => {
      const res = await app.inject({
        body: { fields: [{ name: "title", type: "text" }] },
        headers: auth(),
        method: "POST",
        url: "/api/schemas/collection",
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBeDefined();
    });

    it("creates a global schema", async () => {
      const res = await app.inject({
        body: { label: "Settings", slug: "settings" },
        headers: auth(),
        method: "POST",
        url: "/api/schemas/global",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.slug).toBe("settings");
      expect(body.type).toBe("global");

      const filePath = join(tmpDir, "globals", "settings.ts");
      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("defineGlobal");
    });

    it("creates a component schema", async () => {
      const res = await app.inject({
        body: { label: "Hero", slug: "hero" },
        headers: auth(),
        method: "POST",
        url: "/api/schemas/component",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.slug).toBe("hero");
      expect(body.type).toBe("component");

      const filePath = join(tmpDir, "components", "hero.ts");
      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("defineComponent");
    });
  });

  describe("PUT /api/schemas/:type/:slug", () => {
    it("updates an existing schema", async () => {
      const res = await app.inject({
        body: {
          fields: [
            { name: "title", type: "text" },
            { name: "body", type: "textarea" },
          ],
          label: "Post Updated",
        },
        headers: auth(),
        method: "PUT",
        url: "/api/schemas/collection/posts",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.message).toBe("Schema saved");

      const filePath = join(tmpDir, "collections", "posts.ts");
      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("textarea(");
      expect(content).toContain("Post Updated");
    });

    it("returns 404 if schema not found", async () => {
      const res = await app.inject({
        body: { fields: [{ name: "x", type: "text" }] },
        headers: auth(),
        method: "PUT",
        url: "/api/schemas/collection/nonexistent",
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("Schema not found");
    });

    it("returns 400 for invalid type", async () => {
      const res = await app.inject({
        body: {},
        headers: auth(),
        method: "PUT",
        url: "/api/schemas/invalid/posts",
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for empty field name in update", async () => {
      const res = await app.inject({
        body: { fields: [{ name: "", type: "text" }] },
        headers: auth(),
        method: "PUT",
        url: "/api/schemas/collection/posts",
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toContain("empty name");
    });
  });

  describe("DELETE /api/schemas/:type/:slug", () => {
    it("deletes a schema file", async () => {
      const filePath = join(tmpDir, "collections", "articles.ts");
      const existsBefore = (await import("node:fs/promises")).access(filePath).then(
        () => true,
        () => false,
      );
      expect(await existsBefore).toBe(true);

      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: "/api/schemas/collection/articles",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.message).toBe("Schema deleted");

      const existsAfter = (await import("node:fs/promises")).access(filePath).then(
        () => true,
        () => false,
      );
      expect(await existsAfter).toBe(false);
    });

    it("returns 404 if schema not found", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: "/api/schemas/collection/nonexistent",
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("Schema not found");
    });

    it("returns 400 for invalid type", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: "/api/schemas/invalid/posts",
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
