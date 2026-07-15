import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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
  rmSync(tmpDir, { recursive: true, force: true });
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
    get: vi.fn((url: string, _opts: unknown, handler: (...args: unknown[]) => Promise<void>) => {
      routes.push({
        method: "GET",
        url,
        handler: handler as (
          req: Record<string, unknown>,
          reply: Record<string, unknown>,
        ) => Promise<void>,
      });
    }),
    post: vi.fn((url: string, _opts: unknown, handler: (...args: unknown[]) => Promise<void>) => {
      routes.push({
        method: "POST",
        url,
        handler: handler as (
          req: Record<string, unknown>,
          reply: Record<string, unknown>,
        ) => Promise<void>,
      });
    }),
    put: vi.fn((url: string, _opts: unknown, handler: (...args: unknown[]) => Promise<void>) => {
      routes.push({
        method: "PUT",
        url,
        handler: handler as (
          req: Record<string, unknown>,
          reply: Record<string, unknown>,
        ) => Promise<void>,
      });
    }),
    delete: vi.fn((url: string, _opts: unknown, handler: (...args: unknown[]) => Promise<void>) => {
      routes.push({
        method: "DELETE",
        url,
        handler: handler as (
          req: Record<string, unknown>,
          reply: Record<string, unknown>,
        ) => Promise<void>,
      });
    }),
  };

  return { fastify, routes };
}

function makeReply() {
  const status = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();
  return { status, send };
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
    await route.handler({ params: { type: "collection", slug: "posts" } }, reply);
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
    await route.handler({ params: { type: "collection", slug: "nonexistent" } }, reply);
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
        params: { type: "collection" },
        body: {
          slug: "articles",
          fields: [
            { name: "title", type: "text" },
            { name: "body", type: "richText" },
            { name: "author", type: "relation", to: "users", kind: "oneToOne" },
            {
              name: "status",
              type: "select",
              options: [{ label: "Draft", value: "draft" }, "published"],
            },
            { name: "tags", type: "multiSelect", options: ["a", "b"] },
          ],
        },
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
        params: { type: "collection" },
        body: {
          slug: "pages",
          fields: [
            { name: "seo", type: "component", component: "seo", repeatable: false },
            { name: "blocks", type: "dynamicZone", components: ["hero", "cta"] },
            { name: "items", type: "array", fields: [{ name: "name", type: "text" }] },
            { name: "meta", type: "object", fields: [{ name: "key", type: "text" }] },
          ],
        },
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
        params: { type: "collection" },
        body: {
          slug: "mixed",
          fields: [
            { name: "path", type: "slug", source: "title", unique: true },
            { name: "css", type: "code", language: "css" },
            { name: "bg", type: "color", format: "hex" },
            { name: "image", type: "media", multiple: true, allowedTypes: ["image"] },
            { name: "file", type: "upload", multiple: false },
          ],
        },
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
        params: { type: "collection" },
        body: {
          slug: "tabbed",
          fields: [
            {
              name: "content",
              type: "tabs",
              tabs: [{ label: "Main", fields: [{ name: "title", type: "text" }] }],
            },
          ],
        },
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
      { params: { type: "global" }, body: { slug: "settings", label: "Settings" } },
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
      { params: { type: "component" }, body: { slug: "hero", label: "Hero" } },
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
        params: { type: "collection" },
        body: { slug: "tags", fields: [{ name: "name", type: "text" }] },
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
    await route.handler({ params: { type: "collection" }, body: {} }, reply);
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
    await route.handler({ params: { type: "invalid" }, body: { slug: "test" } }, reply);
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
    await route.handler({ params: { type: "collection" }, body: { slug: "existing" } }, reply);
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
      { params: { type: "global" }, body: { slug: "config", label: "Config" } },
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
      { params: { type: "component" }, body: { slug: "cta", label: "CTA" } },
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
        params: { type: "collection", slug: "posts" },
        body: { fields: [{ name: "title", type: "text" }] },
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
    await route.handler({ params: { type: "invalid", slug: "test" }, body: {} }, reply);
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
    await route.handler({ params: { type: "collection", slug: "nonexistent" }, body: {} }, reply);
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
    await route.handler({ params: { type: "collection", slug: "posts" } }, reply);
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
    await route.handler({ params: { type: "invalid", slug: "test" } }, reply);
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
    await route.handler({ params: { type: "collection", slug: "nonexistent" } }, reply);
    expect(reply.status).toHaveBeenCalledWith(404);
  });
});
