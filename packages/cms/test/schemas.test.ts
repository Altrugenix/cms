import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let tmpDir: string;
let config: { schema: { baseDir: string } };

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "cms-schemas-test-"));
  config = { schema: { baseDir: tmpDir } };
  mkdirSync(join(tmpDir, "collections"), { recursive: true });
  mkdirSync(join(tmpDir, "globals"), { recursive: true });
  mkdirSync(join(tmpDir, "components"), { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { force: true, recursive: true });
  vi.restoreAllMocks();
  vi.resetModules();
});

function createMockFastify() {
  const routes: Array<{
    method: string;
    url: string;
    handler: (req: Record<string, unknown>, reply: Record<string, unknown>) => Promise<void>;
  }> = [];

  const fastify = {
    authenticate: vi.fn(),
    delete: vi.fn((url: string, _opts: unknown, handler: (...args: unknown[]) => Promise<void>) => {
      routes.push({
        handler: handler as (
          req: Record<string, unknown>,
          reply: Record<string, unknown>,
        ) => Promise<void>,
        method: "DELETE",
        url,
      });
    }),
    get: vi.fn((url: string, _opts: unknown, handler: (...args: unknown[]) => Promise<void>) => {
      routes.push({
        handler: handler as (
          req: Record<string, unknown>,
          reply: Record<string, unknown>,
        ) => Promise<void>,
        method: "GET",
        url,
      });
    }),
    post: vi.fn((url: string, _opts: unknown, handler: (...args: unknown[]) => Promise<void>) => {
      routes.push({
        handler: handler as (
          req: Record<string, unknown>,
          reply: Record<string, unknown>,
        ) => Promise<void>,
        method: "POST",
        url,
      });
    }),
    put: vi.fn((url: string, _opts: unknown, handler: (...args: unknown[]) => Promise<void>) => {
      routes.push({
        handler: handler as (
          req: Record<string, unknown>,
          reply: Record<string, unknown>,
        ) => Promise<void>,
        method: "PUT",
        url,
      });
    }),
    requirePermission: vi.fn(() => vi.fn()),
  };

  return { fastify, routes };
}

function makeReply() {
  const status = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();
  return { send, status };
}

describe("registerSchemaRoutes — list & get schemas", () => {
  beforeEach(async () => {
    writeFileSync(
      join(tmpDir, "collections", "posts.ts"),
      [
        'import { defineCollection, text, slug } from "@arche-cms/schema";',
        "export default defineCollection({",
        '  slug: "posts",',
        '  labels: { singular: "Post", plural: "Posts" },',
        "  fields: [",
        '    text("title"),',
        '    slug("slug"),',
        "  ],",
        "});",
      ].join("\n"),
    );
    writeFileSync(
      join(tmpDir, "globals", "site.ts"),
      [
        'import { defineGlobal, text } from "@arche-cms/schema";',
        "export default defineGlobal({",
        '  slug: "site",',
        '  label: "Site Settings",',
        "  fields: [",
        '    text("title"),',
        "  ],",
        "});",
      ].join("\n"),
    );
  });

  it("GET /api/schemas returns all schemas", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "GET" && r.url === "/api/schemas",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({}, reply);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ slug: "posts", type: "collection" }),
          expect.objectContaining({ slug: "site", type: "global" }),
        ]),
      }),
    );
  });

  it("GET /api/schemas/:type/:slug returns single schema", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "GET" && r.url === "/api/schemas/:type/:slug",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({ params: { slug: "posts", type: "collection" } }, reply);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "posts", type: "collection" }),
    );
  });

  it("GET /api/schemas/:type/:slug returns 404 for missing schema", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "GET" && r.url === "/api/schemas/:type/:slug",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({ params: { slug: "nonexistent", type: "collection" } }, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: "Schema not found" });
  });
});

describe("registerSchemaRoutes — field type code generation", () => {
  it("generates code with relation, select, and options fields", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler(
      {
        body: {
          fields: [
            { name: "title", type: "text" },
            { name: "body", type: "richText" },
            { kind: "oneToOne", name: "author", to: "users", type: "relation" },
            {
              name: "status",
              options: [{ label: "Draft", value: "draft" }, "published"],
              type: "select",
            },
            { name: "tags", options: ["a", "b"], type: "multiSelect" },
          ],
          slug: "articles",
        },
        params: { type: "collection" },
      },
      reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    const content = (await import("node:fs")).readFileSync(
      join(tmpDir, "collections", "articles.ts"),
      "utf-8",
    );
    expect(content).toContain("relation(");
    expect(content).toContain("select(");
    expect(content).toContain("multiSelect(");
    expect(content).toContain("richText(");
  });

  it("generates code with component, dynamicZone, and nested fields", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler(
      {
        body: {
          fields: [
            { component: "seo", name: "seo", repeatable: false, type: "component" },
            { components: ["hero", "cta"], name: "blocks", type: "dynamicZone" },
            { fields: [{ name: "name", type: "text" }], name: "items", type: "array" },
            { fields: [{ name: "key", type: "text" }], name: "meta", type: "object" },
          ],
          slug: "pages",
        },
        params: { type: "collection" },
      },
      reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    const content = (await import("node:fs")).readFileSync(
      join(tmpDir, "collections", "pages.ts"),
      "utf-8",
    );
    expect(content).toContain("component(");
    expect(content).toContain("dynamicZone(");
    expect(content).toContain("array(");
    expect(content).toContain("object(");
  });

  it("generates code with slug, code, color, media, and upload fields", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler(
      {
        body: {
          fields: [
            { name: "path", source: "title", type: "slug", unique: true },
            { language: "css", name: "css", type: "code" },
            { format: "hex", name: "bg", type: "color" },
            { allowedTypes: ["image"], multiple: true, name: "image", type: "media" },
            { multiple: false, name: "file", type: "upload" },
          ],
          slug: "mixed",
        },
        params: { type: "collection" },
      },
      reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    const content = (await import("node:fs")).readFileSync(
      join(tmpDir, "collections", "mixed.ts"),
      "utf-8",
    );
    expect(content).toContain("slug(");
    expect(content).toContain("code(");
    expect(content).toContain("color(");
    expect(content).toContain("media(");
    expect(content).toContain("upload(");
  });

  it("generates code with tabs and group fields", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler(
      {
        body: {
          fields: [
            {
              name: "content",
              tabs: [{ fields: [{ name: "title", type: "text" }], label: "Main" }],
              type: "tabs",
            },
          ],
          slug: "tabbed",
        },
        params: { type: "collection" },
      },
      reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    const content = (await import("node:fs")).readFileSync(
      join(tmpDir, "collections", "tabbed.ts"),
      "utf-8",
    );
    expect(content).toContain("tabs:");
  });

  it("generates global schema code with label", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler(
      { body: { label: "Settings", slug: "settings" }, params: { type: "global" } },
      reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    const content = (await import("node:fs")).readFileSync(
      join(tmpDir, "globals", "settings.ts"),
      "utf-8",
    );
    expect(content).toContain("defineGlobal");
    expect(content).toContain("label:");
  });

  it("generates component schema code", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler(
      { body: { label: "Hero", slug: "hero" }, params: { type: "component" } },
      reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    const content = (await import("node:fs")).readFileSync(
      join(tmpDir, "components", "hero.ts"),
      "utf-8",
    );
    expect(content).toContain("defineComponent");
    expect(content).toContain("label:");
  });
});

describe("registerSchemaRoutes — create schema", () => {
  it("POST /api/schemas/:type creates a collection schema", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler(
      {
        body: { fields: [{ name: "name", type: "text" }], slug: "tags" },
        params: { type: "collection" },
      },
      reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(existsSync(join(tmpDir, "collections", "tags.ts"))).toBe(true);
  });

  it("POST returns 400 when slug is missing", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({ body: {}, params: { type: "collection" } }, reply);
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: "slug is required" });
  });

  it("POST returns 400 when type is invalid", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({ body: { slug: "test" }, params: { type: "invalid" } }, reply);
    expect(reply.status).toHaveBeenCalledWith(400);
  });

  it("POST returns 409 when schema already exists", async () => {
    writeFileSync(join(tmpDir, "collections", "existing.ts"), "// existing");
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({ body: { slug: "existing" }, params: { type: "collection" } }, reply);
    expect(reply.status).toHaveBeenCalledWith(409);
  });

  it("POST creates a global schema with label", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler(
      { body: { label: "Config", slug: "config" }, params: { type: "global" } },
      reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(existsSync(join(tmpDir, "globals", "config.ts"))).toBe(true);
  });

  it("POST creates a component schema", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "POST" && r.url === "/api/schemas/:type",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler(
      { body: { label: "CTA", slug: "cta" }, params: { type: "component" } },
      reply,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(existsSync(join(tmpDir, "components", "cta.ts"))).toBe(true);
  });
});

describe("registerSchemaRoutes — update schema", () => {
  beforeEach(() => {
    writeFileSync(join(tmpDir, "collections", "posts.ts"), "// original");
  });

  it("PUT /api/schemas/:type/:slug updates a schema file", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "PUT" && r.url === "/api/schemas/:type/:slug",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler(
      {
        body: { fields: [{ name: "title", type: "text" }] },
        params: { slug: "posts", type: "collection" },
      },
      reply,
    );
    const content = (await import("node:fs")).readFileSync(
      join(tmpDir, "collections", "posts.ts"),
      "utf-8",
    );
    expect(content).toContain("text(");
  });

  it("PUT returns 400 for invalid type", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "PUT" && r.url === "/api/schemas/:type/:slug",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({ body: {}, params: { slug: "test", type: "invalid" } }, reply);
    expect(reply.status).toHaveBeenCalledWith(400);
  });

  it("PUT returns 404 for missing schema", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "PUT" && r.url === "/api/schemas/:type/:slug",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({ body: {}, params: { slug: "nonexistent", type: "collection" } }, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
  });
});

describe("registerSchemaRoutes — delete schema", () => {
  beforeEach(() => {
    writeFileSync(join(tmpDir, "collections", "posts.ts"), "// to delete");
  });

  it("DELETE /api/schemas/:type/:slug deletes a schema file", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    expect(existsSync(join(tmpDir, "collections", "posts.ts"))).toBe(true);
    const route = routes.find(
      (r) => r.method === "DELETE" && r.url === "/api/schemas/:type/:slug",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({ params: { slug: "posts", type: "collection" } }, reply);
    expect(existsSync(join(tmpDir, "collections", "posts.ts"))).toBe(false);
  });

  it("DELETE returns 400 for invalid type", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "DELETE" && r.url === "/api/schemas/:type/:slug",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({ params: { slug: "test", type: "invalid" } }, reply);
    expect(reply.status).toHaveBeenCalledWith(400);
  });

  it("DELETE returns 404 for missing schema", async () => {
    const { registerSchemaRoutes } = await import("../src/server/routes/schemas.js");
    const { fastify, routes } = createMockFastify();
    registerSchemaRoutes(fastify as never, config);
    const route = routes.find(
      (r) => r.method === "DELETE" && r.url === "/api/schemas/:type/:slug",
    ) as (typeof routes)[number];
    const reply = makeReply();
    await route.handler({ params: { slug: "nonexistent", type: "collection" } }, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
  });
});
