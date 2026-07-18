import type { DatabaseAdapter, CollectionDefinition } from "@arche-cms/types";
import type { FastifyInstance } from "fastify";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import type { ServerConfig } from "../src/server/config.js";

import { createApp } from "../src/server/app.js";

function createMockAdapter(): DatabaseAdapter {
  const posts = new Map<string, Record<string, unknown>>();
  posts.set("1", { body: "World", id: "1", title: "Hello" });
  let nextPostId = 2;

  const users = new Map<string, Record<string, unknown>>();
  let nextUserId = 1;

  const internal = new Map<string, Record<string, unknown>>();
  let nextInternalId = 1;

  function tableStore(_table: string): Map<string, Record<string, unknown>> | null {
    if (_table === "__cms_posts") return posts;
    if (_table === "__cms_users") return users;
    if (_table.startsWith("__cms_")) return internal;
    return posts;
  }

  function nextId(_table: string): () => string {
    if (_table === "__cms_users") return () => String(nextUserId++);
    if (_table.startsWith("__cms_")) return () => String(nextInternalId++);
    return () => String(nextPostId++);
  }

  return {
    connect: async () => {},
    create: async (_table: string, data: Record<string, unknown>) => {
      const store = tableStore(_table);
      const id = nextId(_table)();
      const record = { id, ...data };
      store?.set(id, record);
      return record;
    },
    createTable: async () => {},
    delete: async () => true,
    deleteMany: async () => 0,
    disconnect: async () => {},
    dropTable: async () => {},
    findMany: async (_table: string, options) => {
      const store = tableStore(_table);
      if (!store) return { data: [], total: 0 };
      const all = [...store.values()];
      if (options?.where?.email) {
        const filtered = all.filter((r) => r.email === options.where.email);
        return { data: filtered.slice(0, options?.limit ?? 100), total: filtered.length };
      }
      return { data: all.slice(0, options?.limit ?? 100), total: all.length };
    },
    findOne: async (_table: string, id: string) => {
      const store = tableStore(_table);
      return store?.get(id) ?? null;
    },
    getExecutedMigrations: async () => [],
    raw: async () => [],
    runMigration: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    update: async () => null,
  };
}

const collection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "body", type: "richText" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
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
  swagger: {
    description: "Test",
    title: "Test API",
    version: "1.0.0",
  },
};

describe("CMS API Server", () => {
  let app: FastifyInstance;
  let adapter: DatabaseAdapter;
  let authToken: string;

  beforeAll(async () => {
    adapter = createMockAdapter();
    app = await createApp({
      adapter,
      collections: [collection],
      config: testConfig,
    });
    // Register a user and get an auth token for CRUD tests
    const regRes = await app.inject({
      body: { email: "crud@example.com", password: "password123" },
      method: "POST",
      url: "/api/auth/register",
    });
    authToken = JSON.parse(regRes.body).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("health endpoint returns ok", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
    expect(body.uptime).toBeGreaterThan(0);
  });

  it("Swagger UI is served at /docs", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/docs",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("swagger");
  });

  it("serves collection list endpoint", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.total).toBe(1);
  });

  it("serves collection get endpoint", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "GET",
      url: "/api/posts/1",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("Hello");
  });

  it("serves collection create endpoint", async () => {
    const res = await app.inject({
      body: { body: "Content", title: "New Post" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(201);
  });

  it("serves collection update endpoint", async () => {
    const res = await app.inject({
      body: { body: "Content", title: "Updated" },
      headers: { authorization: `Bearer ${authToken}` },
      method: "PATCH",
      url: "/api/posts/1",
    });
    expect(res.statusCode).toBe(404);
  });

  it("serves collection delete endpoint", async () => {
    const res = await app.inject({
      headers: { authorization: `Bearer ${authToken}` },
      method: "DELETE",
      url: "/api/posts/1",
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns 404 for unknown routes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/unknown",
    });
    expect(res.statusCode).toBe(404);
  });

  it("handles validation for missing body on POST", async () => {
    const res = await app.inject({
      body: null,
      headers: { authorization: `Bearer ${authToken}` },
      method: "POST",
      url: "/api/posts",
    });
    expect(res.statusCode).toBe(400);
  });

  describe("auth endpoints", () => {
    it("registers a new user", async () => {
      const res = await app.inject({
        body: { email: "test@example.com", password: "password123" },
        method: "POST",
        url: "/api/auth/register",
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.user.email).toBe("test@example.com");
      expect(body.accessToken).toBeTruthy();
      expect(body.refreshToken).toBeTruthy();
    });

    it("rejects duplicate registration", async () => {
      const res = await app.inject({
        body: { email: "test@example.com", password: "password123" },
        method: "POST",
        url: "/api/auth/register",
      });
      expect(res.statusCode).toBe(400);
    });

    it("logs in with valid credentials", async () => {
      const res = await app.inject({
        body: { email: "test@example.com", password: "password123" },
        method: "POST",
        url: "/api/auth/login",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.user.email).toBe("test@example.com");
      expect(body.accessToken).toBeTruthy();
    });

    it("rejects login with wrong password", async () => {
      const res = await app.inject({
        body: { email: "test@example.com", password: "wrong" },
        method: "POST",
        url: "/api/auth/login",
      });
      expect(res.statusCode).toBe(401);
    });

    it("rejects register with invalid email format", async () => {
      const res = await app.inject({
        body: { email: "notanemail", password: "password123" },
        method: "POST",
        url: "/api/auth/register",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe("VALIDATION_ERROR");
    });

    it("rejects register with short password", async () => {
      const res = await app.inject({
        body: { email: "valid@example.com", password: "short" },
        method: "POST",
        url: "/api/auth/register",
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe("VALIDATION_ERROR");
    });

    it("handles forgot-password endpoint", async () => {
      const res = await app.inject({
        body: { email: "test@example.com" },
        method: "POST",
        url: "/api/auth/forgot-password",
      });
      expect(res.statusCode).toBe(200);
    });

    it("rejects forgot-password with invalid email", async () => {
      const res = await app.inject({
        body: { email: "bad" },
        method: "POST",
        url: "/api/auth/forgot-password",
      });
      expect(res.statusCode).toBe(400);
    });

    it("handles reset-password endpoint (will fail gracefully)", async () => {
      const res = await app.inject({
        body: { password: "newpassword123", token: "invalid" },
        method: "POST",
        url: "/api/auth/reset-password",
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns setup-status", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/setup-status",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.hasAdmin).toBe(true);
    });

    it("returns user from /me with valid token", async () => {
      const loginRes = await app.inject({
        body: { email: "test@example.com", password: "password123" },
        method: "POST",
        url: "/api/auth/login",
      });
      const { accessToken } = JSON.parse(loginRes.body);

      const meRes = await app.inject({
        headers: { authorization: `Bearer ${accessToken}` },
        method: "GET",
        url: "/api/auth/me",
      });
      expect(meRes.statusCode).toBe(200);
      const meBody = JSON.parse(meRes.body);
      expect(meBody.email).toBe("test@example.com");
    });

    it("rejects /me without token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/me",
      });
      expect(res.statusCode).toBe(401);
    });

    it("refreshes tokens", async () => {
      const loginRes = await app.inject({
        body: { email: "test@example.com", password: "password123" },
        method: "POST",
        url: "/api/auth/login",
      });
      const { refreshToken } = JSON.parse(loginRes.body);

      const refreshRes = await app.inject({
        body: { refreshToken },
        method: "POST",
        url: "/api/auth/refresh",
      });
      expect(refreshRes.statusCode).toBe(200);
      const body = JSON.parse(refreshRes.body);
      expect(body.accessToken).toBeTruthy();
      expect(body.refreshToken).toBeTruthy();
    });
  });

  describe("GraphQL endpoint", () => {
    let authToken: string;

    beforeAll(async () => {
      const res = await app.inject({
        body: { email: "test@example.com", password: "password123" },
        method: "POST",
        url: "/api/auth/login",
      });
      authToken = JSON.parse(res.body).accessToken;
    });

    it("serves GraphiQL at /graphiql", async () => {
      const res = await app.inject({
        headers: { authorization: `Bearer ${authToken}` },
        method: "GET",
        url: "/graphiql",
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain("graphiql");
    });

    it("executes listPosts query", async () => {
      const res = await app.inject({
        body: { query: "{ listPosts { data { id title } total limit offset } }" },
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: "/graphql",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.data.listPosts.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data.listPosts.data[0].id).toBeDefined();
      expect(body.data.listPosts.total).toBeDefined();
    });

    it("executes posts query by id", async () => {
      const res = await app.inject({
        body: { query: '{ posts(id: "1") { id title } }' },
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: "/graphql",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.posts).toBeDefined();
      expect(body.data.posts.id).toBe("1");
    });

    it("executes createPosts mutation", async () => {
      const res = await app.inject({
        body: { query: 'mutation { createPosts(data: { title: "New" }) { id title } }' },
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: "/graphql",
      });
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.errors).toBeUndefined();
    });

    it("executes updatePosts mutation", async () => {
      const res = await app.inject({
        body: {
          query: 'mutation { updatePosts(id: "1", data: { title: "Updated" }) { id title } }',
        },
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: "/graphql",
      });
      const body = JSON.parse(res.body);
      expect(body.errors).toBeDefined();
      expect(body.errors[0].message).toContain("Not found");
    });

    it("executes deletePosts mutation", async () => {
      const res = await app.inject({
        body: { query: 'mutation { deletePosts(id: "1") }' },
        headers: { authorization: `Bearer ${authToken}` },
        method: "POST",
        url: "/graphql",
      });
      const body = JSON.parse(res.body);
      expect(body.data?.deletePosts).toBe(true);
    });
  });

  describe("collection and global metadata endpoints", () => {
    let metaApp: FastifyInstance;
    let metaAuthToken: string;

    beforeAll(async () => {
      metaApp = await createApp({
        adapter: createMockAdapter(),
        collections: [
          {
            fields: [
              { name: "title", type: "text" },
              { name: "category", options: [{ label: "A", value: "a" }, "b"], type: "select" },
              { name: "tags", options: ["x", "y"], type: "multiSelect" },
              { name: "color", options: ["red", "blue"], type: "radio" },
            ],
            labels: { plural: "Products", singular: "Product" },
            slug: "products",
          },
        ],
        config: testConfig,
        globals: [
          {
            fields: [
              { name: "siteName", type: "text" },
              { name: "logo", to: "media", type: "relation" },
              { name: "theme", options: ["light", "dark"], type: "select" },
            ],
            label: "Settings",
            slug: "settings",
          },
        ],
      });
      const loginRes = await metaApp.inject({
        body: { email: "admin@arche-cms.com", password: "admin123" },
        method: "POST",
        url: "/api/auth/login",
      });
      metaAuthToken = JSON.parse(loginRes.body).accessToken;
    });

    afterAll(async () => {
      await metaApp.close();
    });

    it("returns collection metadata with field options", async () => {
      const res = await metaApp.inject({
        headers: { authorization: `Bearer ${metaAuthToken}` },
        method: "GET",
        url: "/api/collections",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const products = body.find((c: Record<string, unknown>) => c.slug === "products");
      expect(products).toBeDefined();
      const category = products.fields.find((f: Record<string, unknown>) => f.name === "category");
      expect(category.options).toEqual(["a", "b"]);
    });

    it("returns global metadata with relation and select fields", async () => {
      const res = await metaApp.inject({
        headers: { authorization: `Bearer ${metaAuthToken}` },
        method: "GET",
        url: "/api/globals",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      const settings = body.find((g: Record<string, unknown>) => g.slug === "settings");
      expect(settings).toBeDefined();
      const logo = settings.fields.find((f: Record<string, unknown>) => f.name === "logo");
      expect(logo.to).toBe("media");
      const theme = settings.fields.find((f: Record<string, unknown>) => f.name === "theme");
      expect(theme.options).toEqual(["light", "dark"]);
    });
  });

  describe("permissions and error handling", () => {
    it("returns 401 for roles endpoint without auth", async () => {
      const res = await app.inject({
        body: { description: "A test role", name: "test", permissions: [] },
        method: "POST",
        url: "/api/roles",
      });
      expect(res.statusCode).toBe(401);
    });

    it("health degraded when adapter fails", async () => {
      const adapter = createMockAdapter();
      const origRaw = adapter.raw;
      adapter.raw = async (...args: unknown[]) => {
        if (
          args[0] !== undefined &&
          typeof args[0] === "string" &&
          args[0].toLowerCase().startsWith("select 1")
        ) {
          throw new Error("db down");
        }
        return origRaw(...args);
      };
      const degradedApp = await createApp({
        adapter,
        collections: [collection],
        config: testConfig,
      });
      const res = await degradedApp.inject({ method: "GET", url: "/health" });
      const body = JSON.parse(res.body);
      expect(body.db).toBe("error");
      expect(body.status).toBe("degraded");
      await degradedApp.close();
    });
  });
});
