import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import type { DatabaseAdapter, CollectionDefinition } from "@arche-cms/types";
import { createApp } from "../src/server/app.js";
import type { ServerConfig } from "../src/server/config.js";

function createMockAdapter(): DatabaseAdapter {
  const posts = new Map<string, Record<string, unknown>>();
  posts.set("1", { id: "1", title: "Hello", body: "World" });
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
    findOne: async (_table: string, id: string) => {
      const store = tableStore(_table);
      return store?.get(id) ?? null;
    },
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
    create: async (_table: string, data: Record<string, unknown>) => {
      const store = tableStore(_table);
      const id = nextId(_table)();
      const record = { id, ...data };
      store?.set(id, record);
      return record;
    },
    update: async () => null,
    delete: async () => true,
    deleteMany: async () => 0,
    connect: async () => {},
    disconnect: async () => {},
    transaction: async <T>(fn: () => Promise<T>) => fn(),
    raw: async () => [],
    createTable: async () => {},
    dropTable: async () => {},
    runMigration: async () => {},
    getExecutedMigrations: async () => [],
  };
}

const collection: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "body", type: "richText" },
  ],
};

const testConfig: ServerConfig = {
  port: 0,
  host: "localhost",
  logger: { level: "silent" },
  cors: { origin: "*" },
  rateLimit: { max: 1000, timeWindow: "1 minute" },
  swagger: {
    title: "Test API",
    version: "1.0.0",
    description: "Test",
  },
  schema: { baseDir: "./cms" },
  database: { adapter: "sqlite", url: ":memory:" },
  auth: {
    secret: "test-secret-at-least-32-chars-long-for-security!!",
    accessTokenExpiresIn: "15m",
    refreshTokenExpiresIn: "7d",
  },
  storage: { baseDir: "./uploads" },
};

describe("CMS API Server", () => {
  let app: FastifyInstance;
  let adapter: DatabaseAdapter;
  let authToken: string;

  beforeAll(async () => {
    adapter = createMockAdapter();
    app = await createApp({
      config: testConfig,
      adapter,
      collections: [collection],
    });
    // Register a user and get an auth token for CRUD tests
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      body: { email: "crud@example.com", password: "password123" },
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
      method: "GET",
      url: "/api/posts",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(body.total).toBe(1);
  });

  it("serves collection get endpoint", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/posts/1",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.title).toBe("Hello");
  });

  it("serves collection create endpoint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/posts",
      headers: { authorization: `Bearer ${authToken}` },
      body: { title: "New Post", body: "Content" },
    });
    expect(res.statusCode).toBe(201);
  });

  it("serves collection update endpoint", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/posts/1",
      headers: { authorization: `Bearer ${authToken}` },
      body: { title: "Updated", body: "Content" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("serves collection delete endpoint", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/posts/1",
      headers: { authorization: `Bearer ${authToken}` },
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
      method: "POST",
      url: "/api/posts",
      headers: { authorization: `Bearer ${authToken}` },
      body: null,
    });
    expect(res.statusCode).toBe(400);
  });

  describe("auth endpoints", () => {
    it("registers a new user", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        body: { email: "test@example.com", password: "password123" },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.user.email).toBe("test@example.com");
      expect(body.accessToken).toBeTruthy();
      expect(body.refreshToken).toBeTruthy();
    });

    it("rejects duplicate registration", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        body: { email: "test@example.com", password: "password123" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("logs in with valid credentials", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        body: { email: "test@example.com", password: "password123" },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.user.email).toBe("test@example.com");
      expect(body.accessToken).toBeTruthy();
    });

    it("rejects login with wrong password", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        body: { email: "test@example.com", password: "wrong" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns user from /me with valid token", async () => {
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        body: { email: "test@example.com", password: "password123" },
      });
      const { accessToken } = JSON.parse(loginRes.body);

      const meRes = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: { authorization: `Bearer ${accessToken}` },
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
        method: "POST",
        url: "/api/auth/login",
        body: { email: "test@example.com", password: "password123" },
      });
      const { refreshToken } = JSON.parse(loginRes.body);

      const refreshRes = await app.inject({
        method: "POST",
        url: "/api/auth/refresh",
        body: { refreshToken },
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
        method: "POST",
        url: "/api/auth/login",
        body: { email: "test@example.com", password: "password123" },
      });
      authToken = JSON.parse(res.body).accessToken;
    });

    it("serves GraphiQL at /graphiql", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/graphiql",
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain("graphiql");
    });

    it("executes listPosts query", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/graphql",
        headers: { authorization: `Bearer ${authToken}` },
        body: { query: "{ listPosts { id title } }" },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.data.listPosts.length).toBeGreaterThanOrEqual(1);
      expect(body.data.listPosts[0].id).toBeDefined();
    });

    it("executes posts query by id", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/graphql",
        headers: { authorization: `Bearer ${authToken}` },
        body: { query: '{ posts(id: "1") { id title } }' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.posts).toBeDefined();
      expect(body.data.posts.id).toBe("1");
    });

    it("executes createPosts mutation", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/graphql",
        headers: { authorization: `Bearer ${authToken}` },
        body: { query: 'mutation { createPosts(data: { title: "New" }) { id title } }' },
      });
      const body = JSON.parse(res.body);
      expect(body.data).toBeDefined();
      expect(body.errors).toBeUndefined();
    });

    it("executes updatePosts mutation", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/graphql",
        headers: { authorization: `Bearer ${authToken}` },
        body: {
          query: 'mutation { updatePosts(id: "1", data: { title: "Updated" }) { id title } }',
        },
      });
      const body = JSON.parse(res.body);
      expect(body.errors).toBeDefined();
      expect(body.errors[0].message).toContain("Not found");
    });

    it("executes deletePosts mutation", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/graphql",
        headers: { authorization: `Bearer ${authToken}` },
        body: { query: 'mutation { deletePosts(id: "1") }' },
      });
      const body = JSON.parse(res.body);
      expect(body.data?.deletePosts).toBe(true);
    });
  });
});
