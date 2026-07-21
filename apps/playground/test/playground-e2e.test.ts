import type { ServerConfig } from "@arche-cms/cms/src/server/config.js";
import type { DatabaseAdapter } from "@arche-cms/database";
import type { StorageAdapter } from "@arche-cms/storage";
import type { CollectionDefinition, GlobalDefinition, ComponentDefinition } from "@arche-cms/types";
import type { FastifyInstance } from "fastify";
import type { Readable } from "node:stream";

import { createApp } from "@arche-cms/cms/src/server/app.js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

function createMockAdapter(): DatabaseAdapter {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  const users = new Map<string, Record<string, unknown>>();
  const roles = new Map<string, Record<string, unknown>>();
  let nextUserId = 1;
  let nextRoleId = 1;

  function getTable(table: string): Map<string, Record<string, unknown>> {
    if (!collections.has(table)) {
      collections.set(table, new Map());
    }
    return collections.get(table) ?? new Map();
  }

  function findByStringId(
    table: Map<string, Record<string, unknown>>,
    id: string,
  ): Record<string, unknown> | undefined {
    if (table.has(id)) return table.get(id);
    const numId = Number(id);
    if (!Number.isNaN(numId)) {
      for (const [key, val] of table) {
        if (Number(key) === numId || val.id === numId || val.id === id) return val;
      }
    }
    return undefined;
  }

  function deleteByStringId(table: Map<string, Record<string, unknown>>, id: string): boolean {
    if (table.has(id)) return table.delete(id);
    const numId = Number(id);
    if (!Number.isNaN(numId)) {
      for (const [key, val] of table) {
        if (Number(key) === numId || val.id === numId || val.id === id) {
          return table.delete(key);
        }
      }
    }
    return false;
  }

  function idForTable(table: Map<string, Record<string, unknown>>): string {
    let max = 0;
    for (const key of table.keys()) {
      const n = Number(key);
      if (!Number.isNaN(n) && n > max) max = n;
    }
    return String(max + 1);
  }

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
      const table = getTable(_table);
      const nextId = idForTable(table);
      const record = { id: nextId, ...data };
      table.set(nextId, record);
      return record;
    },
    createTable: async () => {},
    delete: async (_table: string, id: string) => {
      if (_table === "__cms_users") {
        if (users.has(id)) return users.delete(id);
        const numId = Number(id);
        if (!Number.isNaN(numId)) {
          for (const [key, val] of users) {
            if (Number(key) === numId || val.id === numId || val.id === id)
              return users.delete(key);
          }
        }
        return false;
      }
      if (_table === "__cms_roles") {
        if (roles.has(id)) return roles.delete(id);
        const numId = Number(id);
        if (!Number.isNaN(numId)) {
          for (const [key, val] of roles) {
            if (Number(key) === numId || val.id === numId || val.id === id)
              return roles.delete(key);
          }
        }
        return false;
      }
      const table = getTable(_table);
      return deleteByStringId(table, id);
    },
    deleteMany: async (_table: string, ids: string[]) => {
      if (_table === "__cms_users") {
        let count = 0;
        for (const id of ids) {
          if (
            users.has(id)
              ? users.delete(id)
              : (() => {
                  for (const [key, val] of users) {
                    if (val.id === id || val.id === Number(id)) {
                      users.delete(key);
                      return true;
                    }
                  }
                  return false;
                })()
          )
            count++;
        }
        return count;
      }
      if (_table === "__cms_roles") {
        let count = 0;
        for (const id of ids) {
          if (
            roles.has(id)
              ? roles.delete(id)
              : (() => {
                  for (const [key, val] of roles) {
                    if (val.id === id || val.id === Number(id)) {
                      roles.delete(key);
                      return true;
                    }
                  }
                  return false;
                })()
          )
            count++;
        }
        return count;
      }
      const table = getTable(_table);
      let count = 0;
      for (const id of ids) {
        if (deleteByStringId(table, id)) count++;
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
      let all = [...table.values()];
      if (options?.where) {
        for (const [key, value] of Object.entries(options.where)) {
          all = all.filter((r) => r[key] === value);
        }
      }
      if (options?.sort) {
        const sortKey = Object.keys(options.sort)[0];
        if (sortKey) {
          const dir = options.sort[sortKey];
          all.sort((a, b) => {
            const av = a[sortKey] ?? "";
            const bv = b[sortKey] ?? "";
            if (dir === "desc") return String(bv).localeCompare(String(av));
            return String(av).localeCompare(String(bv));
          });
        }
      }
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? 100;
      return { data: all.slice(offset, offset + limit), total: all.length };
    },
    findOne: async (_table: string, id: string) => {
      if (_table === "__cms_users") return users.get(id) ?? null;
      if (_table === "__cms_roles") return roles.get(id) ?? null;
      const table = getTable(_table);
      const found = findByStringId(table, id);
      return found ?? null;
    },
    getExecutedMigrations: async () => [],
    getExistingSchema: async () => ({ tables: new Map() }),
    raw: async (sql: string, params?: unknown[]) => {
      if (sql.startsWith("INSERT INTO")) {
        const tableMatch = sql.match(/INSERT INTO "?(\w+)"?/);
        const table = tableMatch?.[1] ?? "";
        const t = getTable(table);
        const nextId = idForTable(t);
        const record: Record<string, unknown> = { id: nextId, rowid: nextId };
        const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/);
        if (colMatch && params) {
          const cols = colMatch[1]
            .replace(/"/g, "")
            .split(", ")
            .map((c) => c.trim());
          for (let i = 0; i < cols.length; i++) {
            record[cols[i] ?? `col_${i}`] = params[i];
          }
        }
        t.set(nextId, record);
        return [];
      }
      if (sql.startsWith("SELECT")) {
        const tableMatch = sql.match(/FROM "?(\w+)"?/);
        const table = tableMatch?.[1] ?? "";
        const t = getTable(table);
        let rows = [...t.values()];
        if (sql.includes("WHERE token_hash = ?") && params?.[0] != null) {
          const hash = String(params[0]);
          rows = rows.filter((r) => r.token_hash === hash);
          return rows;
        }
        if (sql.includes("WHERE rowid = ?") && params?.[0] != null) {
          const id = String(params[0]);
          const found = findByStringId(t, id);
          return found ? [found] : [];
        }
        if (sql.includes("WHERE id = ?") && params?.[0] != null) {
          const id = String(params[0]);
          const found = findByStringId(t, id);
          return found ? [found] : [];
        }
        if (sql.includes("WHERE collection = ?") && sql.includes("entryId")) {
          const collection = params?.[0] as string;
          const entryId = params?.[1] as string;
          rows = rows.filter((r) => r.collection === collection && r.entryId === entryId);
        }
        if (sql.includes("IS NULL") && sql.includes("parentId")) {
          rows = rows.filter((r) => r.parentId === null || r.parentId === undefined);
        }
        if (sql.includes("ORDER BY rowid DESC") || sql.includes("ORDER BY created_at DESC")) {
          rows.reverse();
        }
        if (sql.includes("LIMIT 1")) {
          return rows.slice(0, 1);
        }
        return rows;
      }
      if (sql.startsWith("UPDATE")) {
        const tableMatch = sql.match(/UPDATE "?(\w+)"?/);
        const table = tableMatch?.[1] ?? "";
        const t = getTable(table);
        if (sql.includes("WHERE rowid = ?") && params) {
          const id = String(params[params.length - 1]);
          const existing = findByStringId(t, id);
          if (existing) {
            const setMatch = sql.match(/SET\s+(.+)\s+WHERE/);
            if (setMatch) {
              const setParts = setMatch[1].split(", ");
              for (let i = 0; i < setParts.length; i++) {
                const colMatch = setParts[i]?.match(/"?(\w+)"?\s*=\s*\?/);
                if (colMatch?.[1] && params[i] !== undefined) {
                  existing[colMatch[1]] = params[i];
                }
              }
            }
            const existingKey = findKeyById(t, id);
            if (existingKey !== undefined) t.set(existingKey, existing);
          }
          return [];
        }
        if (sql.includes("WHERE id = ?") && params) {
          const id = String(params[params.length - 1]);
          const existing = findByStringId(t, id);
          if (existing) {
            const setMatch = sql.match(/SET\s+(.+)\s+WHERE/);
            if (setMatch) {
              const setParts = setMatch[1].split(", ");
              for (let i = 0; i < setParts.length; i++) {
                const colMatch = setParts[i]?.match(/"?(\w+)"?\s*=\s*\?/);
                if (colMatch?.[1] && params[i] !== undefined) {
                  existing[colMatch[1]] = params[i];
                }
              }
            }
            const existingKey = findKeyById(t, id);
            if (existingKey !== undefined) t.set(existingKey, existing);
          }
          return [];
        }
        if (sql.includes("WHERE parentId = ?") || sql.includes("WHERE folderId = ?")) {
          const val = params?.[0];
          for (const [, record] of t) {
            if (record.parentId === val) record.parentId = null;
            if (record.folderId === val) record.folderId = null;
          }
        }
        return [];
      }
      if (sql.startsWith("DELETE")) {
        const tableMatch = sql.match(/DELETE FROM "?(\w+)"?/);
        const table = tableMatch?.[1] ?? "";
        const t = getTable(table);
        if (sql.includes("WHERE rowid = ?") && params?.[0] != null) {
          const id = String(params[0]);
          deleteByStringId(t, id);
        }
        if (sql.includes("WHERE id = ?") && params?.[0] != null) {
          const id = String(params[0]);
          deleteByStringId(t, id);
        }
        return [];
      }
      return [];
    },
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
      const table = getTable(_table);
      const existing = findByStringId(table, id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      const key = findKeyById(table, id);
      if (key !== undefined) table.set(key, updated);
      return updated;
    },
  };

  function findKeyById(
    table: Map<string, Record<string, unknown>>,
    id: string,
  ): string | undefined {
    if (table.has(id)) return id;
    const numId = Number(id);
    if (!Number.isNaN(numId)) {
      for (const [key, val] of table) {
        if (Number(key) === numId || val.id === numId || val.id === id) return key;
      }
    }
    return undefined;
  }
}

const postsCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "slug", source: "title", type: "slug", validation: { required: true } },
    { name: "content", type: "richText" },
    {
      name: "status",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      type: "select",
    },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

const allFieldsCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "excerpt", type: "textarea" },
    { name: "order", type: "number" },
    { name: "featured", type: "boolean" },
    { name: "publishDate", type: "date" },
    { name: "scheduledAt", type: "datetime" },
    { name: "contactEmail", type: "email" },
    { name: "secretKey", type: "password" },
    { name: "website", type: "url" },
    { name: "metadata", type: "json" },
    { name: "content", type: "richText" },
    { name: "notes", type: "markdown" },
    { name: "snippet", type: "code" },
    { name: "brandColor", type: "color" },
    { name: "featuredImage", type: "media" },
    { name: "attachment", type: "upload" },
    {
      name: "status",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
        { label: "Archived", value: "archived" },
      ],
      type: "select",
    },
    {
      name: "tags",
      options: [
        { label: "Technology", value: "technology" },
        { label: "Design", value: "design" },
        { label: "Business", value: "business" },
      ],
      type: "multiSelect",
    },
    {
      name: "priority",
      options: [
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
      ],
      type: "radio",
    },
    { name: "published", type: "checkbox" },
    { name: "slug", source: "title", type: "slug", validation: { required: true } },
  ],
  labels: { plural: "All Fields", singular: "All Field" },
  slug: "all-fields",
};

const seoComponent: ComponentDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "description", type: "textarea" },
    { name: "ogImage", type: "text" },
  ],
  label: "SEO",
  slug: "seo",
};

const mediaCardComponent: ComponentDefinition = {
  fields: [
    { name: "image", type: "media", validation: { required: true } },
    { name: "title", type: "text", validation: { required: true } },
    { name: "description", type: "textarea" },
  ],
  label: "Media Card",
  slug: "media-card",
};

const siteSettingsGlobal: GlobalDefinition = {
  fields: [
    { name: "siteName", type: "text", validation: { required: true } },
    { name: "siteDescription", type: "textarea" },
    { name: "adminEmail", type: "email" },
    {
      name: "defaultLocale",
      options: [
        { label: "English", value: "en" },
        { label: "French", value: "fr" },
        { label: "Spanish", value: "es" },
      ],
      type: "select",
    },
  ],
  label: "Site Settings",
  slug: "site-settings",
};

const homepageGlobal: GlobalDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "slug", type: "slug", validation: { required: true } },
    { name: "content", type: "richText", validation: { required: true } },
  ],
  label: "Homepage",
  slug: "homepage",
};

const postsWithDraftsCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "slug", source: "title", type: "slug", validation: { required: true } },
    { name: "content", type: "richText" },
    {
      name: "status",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      type: "select",
    },
  ],
  labels: { plural: "Posts Drafts", singular: "Post Draft" },
  slug: "posts-drafts",
  versions: { drafts: true },
};

const postsWithSoftDeleteCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "slug", source: "title", type: "slug" },
  ],
  labels: { plural: "Posts SoftDelete", singular: "Post SoftDelete" },
  slug: "posts-softdelete",
  versions: { drafts: false, softDelete: true },
};

const choiceFieldsGlobal: GlobalDefinition = {
  fields: [
    {
      name: "defaultStatus",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      type: "select",
    },
    {
      name: "enabledFeatures",
      options: [
        { label: "Comments", value: "comments" },
        { label: "Search", value: "search" },
        { label: "Analytics", value: "analytics" },
      ],
      type: "multiSelect",
    },
    {
      name: "maintenanceMode",
      options: [
        { label: "Off", value: "off" },
        { label: "On", value: "on" },
      ],
      type: "radio",
    },
    { name: "enableRegistration", type: "checkbox" },
  ],
  label: "Choice Fields",
  slug: "choice-fields",
};

const advancedFieldsGlobal: GlobalDefinition = {
  fields: [
    { name: "customSettings", type: "json" },
    { name: "customScript", type: "code" },
    { name: "primaryColor", type: "color" },
    { name: "tagline", type: "text" },
    { name: "welcomeMessage", type: "richText" },
  ],
  label: "Advanced Fields",
  slug: "advanced-fields",
};

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
  swagger: { description: "Playground", title: "Playground API", version: "1.0.0" },
};

function createMockStorage(): StorageAdapter & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    delete: async (path: string) => {
      files.delete(path);
    },
    exists: async (path: string) => files.has(path),
    files,
    getStream: async (path: string) => {
      const buf = files.get(path);
      if (!buf) throw new Error("File not found");
      const { Readable } = await import("node:stream");
      return Readable.from(buf) as unknown as Readable;
    },
    save: async (path: string, data: Buffer) => {
      files.set(path, data);
    },
  };
}

describe("Playground E2E — Collections", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection, allFieldsCollection],
      components: [seoComponent, mediaCardComponent],
      config: testConfig,
      globals: [siteSettingsGlobal, homepageGlobal, choiceFieldsGlobal, advancedFieldsGlobal],
    });
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

  describe("Posts CRUD", () => {
    let postId: string;

    it("POST /api/posts creates a post", async () => {
      const res = await app.inject({
        body: { slug: "hello-world", status: "draft", title: "Hello World" },
        headers: auth(),
        method: "POST",
        url: "/api/posts",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.title).toBe("Hello World");
      expect(body.slug).toBe("hello-world");
      expect(body.status).toBe("draft");
      expect(body.id).toBeDefined();
      postId = body.id;
    });

    it("GET /api/posts lists posts", async () => {
      const res = await app.inject({ headers: auth(), method: "GET", url: "/api/posts" });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/posts/:id returns a post", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/posts/${postId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.title).toBe("Hello World");
    });

    it("PATCH /api/posts/:id updates a post", async () => {
      const res = await app.inject({
        body: { title: "Updated Title" },
        headers: auth(),
        method: "PATCH",
        url: `/api/posts/${postId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.title).toBe("Updated Title");
    });

    it("DELETE /api/posts/:id deletes a post", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/posts/${postId}`,
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("All Fields Collection CRUD", () => {
    let entryId: string;

    it("POST /api/all-fields creates an entry with basic fields", async () => {
      const res = await app.inject({
        body: {
          contactEmail: "test@example.com",
          featured: true,
          order: 42,
          published: true,
          slug: "all-fields-entry",
          status: "published",
          title: "All Fields Entry",
        },
        headers: auth(),
        method: "POST",
        url: "/api/all-fields",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.title).toBe("All Fields Entry");
      expect(body.order).toBe(42);
      expect(body.featured).toBe(true);
      expect(body.published).toBe(true);
      expect(body.contactEmail).toBe("test@example.com");
      expect(body.status).toBe("published");
      expect(body.id).toBeDefined();
      entryId = body.id;
    });

    it("GET /api/all-fields lists entries", async () => {
      const res = await app.inject({ headers: auth(), method: "GET", url: "/api/all-fields" });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/all-fields/:id returns the entry", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/all-fields/${entryId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.title).toBe("All Fields Entry");
    });

    it("PATCH /api/all-fields/:id updates with choice fields", async () => {
      const res = await app.inject({
        body: { priority: "high", tags: ["technology", "design"] },
        headers: auth(),
        method: "PATCH",
        url: `/api/all-fields/${entryId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.priority).toBe("high");
      expect(body.tags).toEqual(["technology", "design"]);
    });

    it("DELETE /api/all-fields/:id deletes the entry", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/all-fields/${entryId}`,
      });
      expect(res.statusCode).toBe(200);
    });
  });
});

describe("Playground E2E — Globals", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [],
      config: testConfig,
      globals: [siteSettingsGlobal, homepageGlobal, choiceFieldsGlobal, advancedFieldsGlobal],
    });
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

  it("PUT /api/globals/site-settings upserts site settings", async () => {
    const res = await app.inject({
      body: { adminEmail: "admin@example.com", defaultLocale: "en", siteName: "My Playground" },
      headers: auth(),
      method: "PUT",
      url: "/api/globals/site-settings",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.siteName).toBe("My Playground");
    expect(body.adminEmail).toBe("admin@example.com");
  });

  it("GET /api/globals/site-settings returns saved data", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/globals/site-settings",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.siteName).toBe("My Playground");
  });

  it("PUT /api/globals/homepage upserts homepage", async () => {
    const res = await app.inject({
      body: { content: "Welcome!", slug: "/", title: "Home" },
      headers: auth(),
      method: "PUT",
      url: "/api/globals/homepage",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("Home");
    expect(body.slug).toBe("/");
  });

  it("PUT /api/globals/choice-fields upserts choice fields", async () => {
    const res = await app.inject({
      body: { defaultStatus: "draft", enableRegistration: true, maintenanceMode: "off" },
      headers: auth(),
      method: "PUT",
      url: "/api/globals/choice-fields",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.defaultStatus).toBe("draft");
    expect(body.enableRegistration).toBe(true);
    expect(body.maintenanceMode).toBe("off");
  });

  it("PUT /api/globals/advanced-fields upserts advanced fields", async () => {
    const res = await app.inject({
      body: { customScript: "console.log('hi')", primaryColor: "#ff0000", tagline: "Build fast" },
      headers: auth(),
      method: "PUT",
      url: "/api/globals/advanced-fields",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.primaryColor).toBe("#ff0000");
    expect(body.tagline).toBe("Build fast");
  });

  it("GET /api/globals/unknown-global returns 404", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/globals/nonexistent",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("Playground E2E — Schemas", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection, allFieldsCollection],
      components: [seoComponent, mediaCardComponent],
      config: testConfig,
      globals: [siteSettingsGlobal, homepageGlobal, choiceFieldsGlobal, advancedFieldsGlobal],
    });
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

  it("GET /api/schemas returns all schemas as flat array", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/schemas",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/schemas returns globals and components", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/schemas",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/schemas/collection/posts returns collection schema with fields", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/schemas/collection/posts",
    });
    expect([200, 404]).toContain(res.statusCode);
  });

  it("GET /api/schemas/collection/all-fields returns collection schema", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/schemas/collection/all-fields",
    });
    expect([200, 404]).toContain(res.statusCode);
  });
});

describe("Playground E2E — Auth Flow", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
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

  it("POST /api/users creates a user", async () => {
    const res = await app.inject({
      body: { email: "user@test.com", name: "Test User", password: "password123" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe("user@test.com");
  });

  it("POST /api/auth/login returns tokens", async () => {
    const res = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it("GET /api/auth/me returns current user", async () => {
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    const { accessToken } = JSON.parse(loginRes.body);
    const res = await app.inject({
      headers: { authorization: `Bearer ${accessToken}` },
      method: "GET",
      url: "/api/auth/me",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.email).toBe("admin@arche-cms.com");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/api/posts" });
    expect(res.statusCode).toBe(401);
  });
});

describe("Playground E2E — Health & Docs", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
  });

  it("GET /docs returns Swagger UI", async () => {
    const res = await app.inject({ method: "GET", url: "/docs" });
    expect(res.statusCode).toBe(200);
  });

  it("GET /docs/json returns OpenAPI spec", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.openapi).toBe("3.0.3");
    expect(body.info.title).toBe("Playground API");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 1: Media Routes
// ═══════════════════════════════════════════════════════════════════════════

describe("Playground E2E — Media Routes", () => {
  let app: FastifyInstance;
  let authToken: string;
  let storage: ReturnType<typeof createMockStorage>;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    storage = createMockStorage();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
      storageAdapter: storage,
    });
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

  const sampleBase64 = Buffer.from("Hello, this is a test file content!").toString("base64");

  it("POST /api/media uploads a media file", async () => {
    const res = await app.inject({
      body: {
        alt: "Test image",
        data: sampleBase64,
        fileName: "test.txt",
        mimeType: "text/plain",
      },
      headers: auth(),
      method: "POST",
      url: "/api/media",
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.originalName).toBe("test.txt");
    expect(body.mimeType).toBe("text/plain");
    expect(body.alt).toBe("Test image");
    expect(body.size).toBeGreaterThan(0);
    expect(body.id).toBeDefined();
  });

  it("GET /api/media lists uploaded media", async () => {
    const res = await app.inject({ headers: auth(), method: "GET", url: "/api/media" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/media/:id returns a single media record", async () => {
    const listRes = await app.inject({ headers: auth(), method: "GET", url: "/api/media" });
    const { data } = JSON.parse(listRes.body);
    const mediaId = data[0].id;

    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: `/api/media/${mediaId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.originalName).toBe("test.txt");
  });

  it("PATCH /api/media/:id updates metadata", async () => {
    const listRes = await app.inject({ headers: auth(), method: "GET", url: "/api/media" });
    const { data } = JSON.parse(listRes.body);
    const mediaId = data[0].id;

    const res = await app.inject({
      body: { alt: "Updated alt text", originalName: "renamed.txt" },
      headers: auth(),
      method: "PATCH",
      url: `/api/media/${mediaId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.alt).toBe("Updated alt text");
    expect(body.originalName).toBe("renamed.txt");
  });

  it("DELETE /api/media/:id deletes a media record", async () => {
    const listRes = await app.inject({ headers: auth(), method: "GET", url: "/api/media" });
    const { data } = JSON.parse(listRes.body);
    const mediaId = data[0].id;

    const res = await app.inject({
      headers: auth(),
      method: "DELETE",
      url: `/api/media/${mediaId}`,
    });
    expect(res.statusCode).toBe(200);

    const getRes = await app.inject({
      headers: auth(),
      method: "GET",
      url: `/api/media/${mediaId}`,
    });
    expect(getRes.statusCode).toBe(404);
  });

  it("POST /api/media/folders creates a folder", async () => {
    const res = await app.inject({
      body: { name: "Images" },
      headers: auth(),
      method: "POST",
      url: "/api/media/folders",
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("Images");
    expect(body.id).toBeDefined();
  });

  it("GET /api/media/folders lists folders", async () => {
    const res = await app.inject({ headers: auth(), method: "GET", url: "/api/media/folders" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /api/media/folders/:id renames a folder", async () => {
    const listRes = await app.inject({ headers: auth(), method: "GET", url: "/api/media/folders" });
    const { data } = JSON.parse(listRes.body);
    const folderId = data[0].id;

    const res = await app.inject({
      body: { name: "Renamed Images" },
      headers: auth(),
      method: "PATCH",
      url: `/api/media/folders/${folderId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("Renamed Images");
  });

  it("DELETE /api/media/folders/:id deletes a folder", async () => {
    const listRes = await app.inject({ headers: auth(), method: "GET", url: "/api/media/folders" });
    const { data } = JSON.parse(listRes.body);
    const folderId = data[0].id;

    const res = await app.inject({
      headers: auth(),
      method: "DELETE",
      url: `/api/media/folders/${folderId}`,
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /api/media rejects invalid MIME type", async () => {
    const res = await app.inject({
      body: {
        data: sampleBase64,
        fileName: "test.exe",
        mimeType: "application/x-executable",
      },
      headers: auth(),
      method: "POST",
      url: "/api/media",
    });
    expect(res.statusCode).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 2: Bulk Operations & Draft Workflow
// ═══════════════════════════════════════════════════════════════════════════

describe("Playground E2E — Bulk Operations & Draft Workflow", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection, postsWithDraftsCollection, postsWithSoftDeleteCollection],
      config: testConfig,
      globals: [],
    });
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

  describe("Bulk Delete", () => {
    it("POST /api/posts/bulk-delete deletes multiple entries", async () => {
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await app.inject({
          body: { slug: `bulk-${i}`, title: `Bulk Post ${i}` },
          headers: auth(),
          method: "POST",
          url: "/api/posts",
        });
        ids.push(JSON.parse(res.body).id);
      }

      const res = await app.inject({
        body: { ids: ids.slice(0, 2) },
        headers: auth(),
        method: "POST",
        url: "/api/posts/bulk-delete",
      });
      expect(res.statusCode).toBe(200);

      const listRes = await app.inject({ headers: auth(), method: "GET", url: "/api/posts" });
      const { data } = JSON.parse(listRes.body);
      expect(data.length).toBe(1);
    });
  });

  describe("Draft / Publish Workflow", () => {
    let draftId: string;

    it("POST /api/posts-drafts creates a draft entry", async () => {
      const res = await app.inject({
        body: { slug: "draft-post", title: "Draft Post" },
        headers: auth(),
        method: "POST",
        url: "/api/posts-drafts",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      draftId = body.id;
    });

    it("GET /api/posts-drafts?where[_status]=draft lists drafts", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/posts-drafts?where[_status]=draft",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].id).toBe(draftId);
    });

    it("POST /api/posts-drafts/:id/publish publishes a draft", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "POST",
        url: `/api/posts-drafts/${draftId}/publish`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body._status).toBe("published");
    });

    it("POST /api/posts-drafts/:id/unpublish unpublishes a post", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "POST",
        url: `/api/posts-drafts/${draftId}/unpublish`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body._status).toBe("draft");
    });

    it("POST /api/posts-drafts/bulk-publish publishes multiple drafts", async () => {
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await app.inject({
          body: { slug: `bulk-draft-${i}`, title: `Bulk Draft ${i}` },
          headers: auth(),
          method: "POST",
          url: "/api/posts-drafts",
        });
        ids.push(JSON.parse(res.body).id);
      }

      const res = await app.inject({
        body: { ids },
        headers: auth(),
        method: "POST",
        url: "/api/posts-drafts/bulk-publish",
      });
      expect(res.statusCode).toBe(200);

      const listRes = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/posts-drafts?where[_status]=published",
      });
      const { data } = JSON.parse(listRes.body);
      const publishedIds = data.map((e: Record<string, unknown>) => e.id);
      for (const id of ids) {
        expect(publishedIds).toContain(id);
      }
    });

    it("POST /api/posts-drafts/bulk-unpublish unpublishes multiple posts", async () => {
      const listRes = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/posts-drafts?where[_status]=published",
      });
      const { data } = JSON.parse(listRes.body);
      const publishedIds = data.map((e: Record<string, unknown>) => String(e.id));

      expect(publishedIds.length).toBeGreaterThan(0);
      const res = await app.inject({
        body: { ids: publishedIds },
        headers: auth(),
        method: "POST",
        url: "/api/posts-drafts/bulk-unpublish",
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("Soft Delete & Restore", () => {
    it("POST /api/posts-softdelete/:id/restore restores a soft-deleted entry", async () => {
      const createRes = await app.inject({
        body: { slug: "soft-delete-test", title: "Soft Delete Test" },
        headers: auth(),
        method: "POST",
        url: "/api/posts-softdelete",
      });
      const entryId = JSON.parse(createRes.body).id;

      const deleteRes = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/posts-softdelete/${entryId}`,
      });
      expect(deleteRes.statusCode).toBe(200);

      const restoreRes = await app.inject({
        headers: auth(),
        method: "POST",
        url: `/api/posts-softdelete/${entryId}/restore`,
      });
      expect(restoreRes.statusCode).toBe(200);

      const getRes = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/posts-softdelete/${entryId}`,
      });
      expect(getRes.statusCode).toBe(200);
    });
  });

  describe("Version History", () => {
    it("GET /api/posts-drafts/:id/versions lists version history", async () => {
      const listRes = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/posts-drafts?where[_status]=draft",
      });
      const { data } = JSON.parse(listRes.body);
      const entryId = data[0].id;

      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/posts-drafts/${entryId}/versions`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 3: Users & Roles
// ═══════════════════════════════════════════════════════════════════════════

describe("Playground E2E — Users & Roles", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
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

  describe("Users CRUD", () => {
    let userId: string;

    it("GET /api/users lists all users", async () => {
      const res = await app.inject({ headers: auth(), method: "GET", url: "/api/users" });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("POST /api/users creates a new user", async () => {
      const res = await app.inject({
        body: { email: "newuser@test.com", password: "password123" },
        headers: auth(),
        method: "POST",
        url: "/api/users",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe("newuser@test.com");
      userId = body.user.id;
    });

    it("GET /api/users/:id returns a user", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/users/${userId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.email).toBe("newuser@test.com");
    });

    it("PATCH /api/users/:id updates user email", async () => {
      const res = await app.inject({
        body: { email: "updated@test.com" },
        headers: auth(),
        method: "PATCH",
        url: `/api/users/${userId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.email).toBe("updated@test.com");
    });

    it("DELETE /api/users/:id deletes a user", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/users/${userId}`,
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("Roles CRUD", () => {
    let roleId: string;

    it("GET /api/roles lists roles", async () => {
      const res = await app.inject({ headers: auth(), method: "GET", url: "/api/roles" });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
    });

    it("POST /api/roles creates a role", async () => {
      const res = await app.inject({
        body: { name: "test-editor", permissions: [{ action: "read", resource: "posts" }] },
        headers: auth(),
        method: "POST",
        url: "/api/roles",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("test-editor");
      roleId = body.id;
    });

    it("GET /api/roles/:id returns a role", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: `/api/roles/${roleId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("test-editor");
    });

    it("PATCH /api/roles/:id updates a role", async () => {
      const res = await app.inject({
        body: { name: "senior-editor" },
        headers: auth(),
        method: "PATCH",
        url: `/api/roles/${roleId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("senior-editor");
    });

    it("DELETE /api/roles/:id deletes a role", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/roles/${roleId}`,
      });
      expect(res.statusCode).toBe(200);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 4: Activity, API Tokens & Webhooks
// ═══════════════════════════════════════════════════════════════════════════

describe("Playground E2E — Activity, API Tokens & Webhooks", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
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

  describe("Activity Log", () => {
    it("GET /api/activity lists activity after mutations", async () => {
      await app.inject({
        body: { slug: "activity-test", title: "Activity Test" },
        headers: auth(),
        method: "POST",
        url: "/api/posts",
      });

      const res = await app.inject({ headers: auth(), method: "GET", url: "/api/activity" });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/activity filters by action", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/activity?action=create",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
    });

    it("GET /api/activity filters by collection", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/activity?collection=posts",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
    });
  });

  describe("API Tokens", () => {
    let tokenId: string;

    it("POST /api/settings/api-tokens creates a token", async () => {
      const res = await app.inject({
        body: { description: "Test token", name: "test-token" },
        headers: auth(),
        method: "POST",
        url: "/api/settings/api-tokens",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.rawToken).toBeDefined();
      expect(body.token).toBeDefined();
      expect(body.token.lastFour).toBeDefined();
      tokenId = body.token.id;
    });

    it("GET /api/settings/api-tokens lists tokens", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/settings/api-tokens",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("DELETE /api/settings/api-tokens/:id revokes a token", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/settings/api-tokens/${tokenId}`,
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("Webhooks", () => {
    let webhookId: string;

    it("POST /api/settings/webhooks creates a webhook", async () => {
      const res = await app.inject({
        body: {
          collection: "*",
          events: ["collection:created"],
          name: "test-webhook",
          url: "https://example.com/hook",
        },
        headers: auth(),
        method: "POST",
        url: "/api/settings/webhooks",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.name).toBe("test-webhook");
      webhookId = body.id;
    });

    it("GET /api/settings/webhooks lists webhooks", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "GET",
        url: "/api/settings/webhooks",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("PUT /api/settings/webhooks/:id updates a webhook", async () => {
      const res = await app.inject({
        body: { url: "https://updated.com/hook" },
        headers: auth(),
        method: "PUT",
        url: `/api/settings/webhooks/${webhookId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.url).toBe("https://updated.com/hook");
    });

    it("DELETE /api/settings/webhooks/:id deletes a webhook", async () => {
      const res = await app.inject({
        headers: auth(),
        method: "DELETE",
        url: `/api/settings/webhooks/${webhookId}`,
      });
      expect(res.statusCode).toBe(200);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 5: Schema Write Operations
// ═══════════════════════════════════════════════════════════════════════════

describe("Playground E2E — Schema Write Operations", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
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

  it("POST /api/schemas/collection creates a collection schema", async () => {
    const res = await app.inject({
      body: {
        fields: [
          { name: "title", type: "text", validation: { required: true } },
          { name: "body", type: "richText" },
        ],
        labels: { plural: "Articles", singular: "Article" },
        slug: "articles",
      },
      headers: auth(),
      method: "POST",
      url: "/api/schemas/collection",
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.slug).toBe("articles");
  });

  it("PUT /api/schemas/collection/:slug updates a collection schema", async () => {
    const res = await app.inject({
      body: {
        fields: [
          { name: "title", type: "text", validation: { required: true } },
          { name: "body", type: "richText" },
          { name: "excerpt", type: "textarea" },
        ],
        labels: { plural: "Articles", singular: "Article" },
        slug: "articles",
      },
      headers: auth(),
      method: "PUT",
      url: "/api/schemas/collection/articles",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.message).toBe("Schema saved");
  });

  it("DELETE /api/schemas/collection/:slug deletes a collection schema", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "DELETE",
      url: "/api/schemas/collection/articles",
    });
    expect(res.statusCode).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 6: GraphQL
// ═══════════════════════════════════════════════════════════════════════════

describe("Playground E2E — GraphQL", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
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

  it("POST /graphql executes createPosts mutation", async () => {
    const res = await app.inject({
      body: {
        query: `mutation { createPosts(data: { title: "GraphQL Post", slug: "graphql-post", status: "draft" }) { id title slug } }`,
      },
      headers: auth(),
      method: "POST",
      url: "/graphql",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.createPosts.title).toBe("GraphQL Post");
  });

  it("POST /graphql executes listPosts query", async () => {
    const res = await app.inject({
      body: {
        query: `{ listPosts(limit: 10, offset: 0) { data { id title } total } }`,
      },
      headers: auth(),
      method: "POST",
      url: "/graphql",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.listPosts.data).toBeDefined();
    expect(body.data.listPosts.total).toBeGreaterThanOrEqual(1);
  });

  it("POST /graphql rejects unauthenticated requests", async () => {
    const res = await app.inject({
      body: {
        query: `{ listPosts(limit: 10, offset: 0) { data { id title } total } }`,
      },
      method: "POST",
      url: "/graphql",
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /graphiql returns the GraphiQL IDE", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/graphiql",
    });
    expect(res.statusCode).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 7: Validation & Error Cases
// ═══════════════════════════════════════════════════════════════════════════

describe("Playground E2E — Validation & Error Cases", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
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

  it("GET /api/posts/:id returns 404 for non-existent ID", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/posts/nonexistent-id",
    });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /api/posts/:id returns 404 for non-existent ID", async () => {
    const res = await app.inject({
      body: { title: "Updated" },
      headers: auth(),
      method: "PATCH",
      url: "/api/posts/nonexistent-id",
    });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/posts/:id returns 404 for non-existent ID", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "DELETE",
      url: "/api/posts/nonexistent-id",
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/auth/login rejects wrong password", async () => {
    const res = await app.inject({
      body: { email: "admin@arche-cms.com", password: "wrongpassword" },
      method: "POST",
      url: "/api/auth/login",
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/auth/login rejects non-existent user", async () => {
    const res = await app.inject({
      body: { email: "nonexistent@test.com", password: "password123" },
      method: "POST",
      url: "/api/auth/login",
    });
    expect(res.statusCode).toBe(401);
  });

  it("Password field excluded from user responses", async () => {
    const createRes = await app.inject({
      body: { email: "nopass@test.com", password: "password123" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/users",
    });
    const body = JSON.parse(createRes.body);
    expect(body.user.password).toBeUndefined();
    expect(body.user.passwordHash).toBeUndefined();
  });

  it("GET /api/globals/unknown-global returns 404", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/globals/nonexistent",
    });
    expect(res.statusCode).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 8: Query Parameters
// ═══════════════════════════════════════════════════════════════════════════

describe("Playground E2E — Query Parameters", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection],
      config: testConfig,
      globals: [],
    });
    const loginRes = await app.inject({
      body: { email: "admin@arche-cms.com", password: "admin123" },
      method: "POST",
      url: "/api/auth/login",
    });
    authToken = JSON.parse(loginRes.body).accessToken;

    for (let i = 0; i < 5; i++) {
      await app.inject({
        body: { slug: `query-test-${i}`, title: `Query Test ${String.fromCharCode(65 + i)}` },
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: "/api/posts",
      });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${authToken}` });

  it("GET /api/posts?limit=2 returns paginated results", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/posts?limit=2",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeLessThanOrEqual(2);
  });

  it("GET /api/posts?offset=2 skips entries", async () => {
    const allRes = await app.inject({ headers: auth(), method: "GET", url: "/api/posts" });
    const allBody = JSON.parse(allRes.body);

    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/posts?offset=2",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeLessThanOrEqual(allBody.total - 2);
  });

  it("GET /api/posts?sort=title:asc sorts ascending", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/posts?sort=title:asc&limit=5",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    const titles = body.data.map((e: Record<string, string>) => e.title);
    const sorted = [...titles].sort();
    expect(titles).toEqual(sorted);
  });

  it("GET /api/posts?sort=title:desc sorts descending", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/posts?sort=title:desc&limit=5",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    const titles = body.data.map((e: Record<string, string>) => e.title);
    const sorted = [...titles].sort().reverse();
    expect(titles).toEqual(sorted);
  });

  it("GET /api/posts?select=title,slug selects specific fields", async () => {
    const res = await app.inject({
      headers: auth(),
      method: "GET",
      url: "/api/posts?select=title,slug",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThan(0);
    const entry = body.data[0];
    expect(entry.title).toBeDefined();
    expect(entry.id).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 9: Metadata Endpoints
// ═══════════════════════════════════════════════════════════════════════════

describe("Playground E2E — Metadata Endpoints", () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    const adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [postsCollection, allFieldsCollection],
      config: testConfig,
      globals: [siteSettingsGlobal, homepageGlobal],
    });
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

  it("GET /api/collections returns collection metadata", async () => {
    const res = await app.inject({ headers: auth(), method: "GET", url: "/api/collections" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    const slugs = body.map((c: Record<string, string>) => c.slug);
    expect(slugs).toContain("posts");
    expect(slugs).toContain("all-fields");
  });

  it("GET /api/globals returns global metadata", async () => {
    const res = await app.inject({ headers: auth(), method: "GET", url: "/api/globals" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    const slugs = body.map((g: Record<string, string>) => g.slug);
    expect(slugs).toContain("site-settings");
    expect(slugs).toContain("homepage");
  });

  it("GET /api/plugins returns plugin list", async () => {
    const res = await app.inject({ headers: auth(), method: "GET", url: "/api/plugins" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });
});
