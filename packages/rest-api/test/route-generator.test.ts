import { describe, it, expect } from "vitest";
import type { CollectionDefinition, GlobalDefinition, DatabaseAdapter } from "@arche-cms/database";
import type { RouteHandlerContext, RouteHandlerResult, MiddlewareHooks } from "../src/types.js";
import {
  createCollectionRouter,
  createCollectionRouters,
  createGlobalRouter,
  createGlobalRouters,
} from "../src/route-generator.js";
import { applyMiddleware } from "../src/middleware.js";

const mockAdapter = {
  findOne: async () => null,
  findMany: async () => ({ data: [], total: 0 }),
  create: async () => ({}),
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
} satisfies DatabaseAdapter;

const postCollection: CollectionDefinition = {
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "body", type: "richText" },
    { name: "author", type: "relation", to: "users" },
  ],
};

describe("createCollectionRouter", () => {
  it("generates 6 routes for a collection (5 CRUD + 1 bulk delete)", () => {
    const router = createCollectionRouter(postCollection, mockAdapter);
    expect(router.routes).toHaveLength(6);
  });

  it("generates list route", () => {
    const { routes } = createCollectionRouter(postCollection, mockAdapter);
    const list = routes.find((r) => r.operationId === "listPosts") as {
      method: string;
      path: string;
      tags: string[];
    };
    expect(list.method).toBe("GET");
    expect(list.path).toBe("/api/posts");
    expect(list.tags).toEqual(["Post"]);
  });

  it("generates get route", () => {
    const { routes } = createCollectionRouter(postCollection, mockAdapter);
    const get = routes.find((r) => r.operationId === "getPosts") as {
      method: string;
      path: string;
    };
    expect(get.method).toBe("GET");
    expect(get.path).toBe("/api/posts/:id");
  });

  it("generates create route", () => {
    const { routes } = createCollectionRouter(postCollection, mockAdapter);
    const create = routes.find((r) => r.operationId === "createPosts") as {
      method: string;
      path: string;
    };
    expect(create.method).toBe("POST");
    expect(create.path).toBe("/api/posts");
  });

  it("generates update route", () => {
    const { routes } = createCollectionRouter(postCollection, mockAdapter);
    const update = routes.find((r) => r.operationId === "updatePosts") as {
      method: string;
      path: string;
    };
    expect(update.method).toBe("PATCH");
    expect(update.path).toBe("/api/posts/:id");
  });

  it("generates delete route", () => {
    const { routes } = createCollectionRouter(postCollection, mockAdapter);
    const del = routes.find((r) => r.operationId === "deletePosts") as {
      method: string;
      path: string;
    };
    expect(del.method).toBe("DELETE");
    expect(del.path).toBe("/api/posts/:id");
  });

  it("uses custom basePath", () => {
    const { routes } = createCollectionRouter(postCollection, mockAdapter, {
      basePath: "/cms/api",
    });
    for (const route of routes) {
      expect(route.path).toMatch(/^\/cms\/api\/posts/);
    }
  });

  it("handles slug with hyphens", () => {
    const collection: CollectionDefinition = {
      slug: "blog-posts",
      labels: { singular: "Blog Post", plural: "Blog Posts" },
      fields: [{ name: "title", type: "text" }],
    };
    const { routes } = createCollectionRouter(collection, mockAdapter);
    expect(routes[0]).toHaveProperty("operationId", "listBlogPosts");
    expect(routes[0]).toHaveProperty("path", "/api/blog-posts");
  });

  it("adds restore route when softDelete enabled", () => {
    const collection: CollectionDefinition = {
      slug: "posts",
      labels: { singular: "Post", plural: "Posts" },
      fields: [{ name: "title", type: "text" }],
      versions: { drafts: false, softDelete: true },
    };
    const { routes } = createCollectionRouter(collection, mockAdapter);
    expect(routes).toHaveLength(9);
    const restore = routes.find((r) => r.operationId === "restorePosts") as {
      method: string;
      path: string;
    };
    expect(restore).toBeDefined();
    expect(restore.method).toBe("POST");
    expect(restore.path).toBe("/api/posts/:id/restore");
  });

  it("adds publish/unpublish routes when drafts enabled", () => {
    const collection: CollectionDefinition = {
      slug: "posts",
      labels: { singular: "Post", plural: "Posts" },
      fields: [{ name: "title", type: "text" }],
      versions: { drafts: true },
    };
    const { routes } = createCollectionRouter(collection, mockAdapter);
    expect(routes).toHaveLength(10);
    expect(routes.find((r) => r.operationId === "publishPosts")).toBeDefined();
    expect(routes.find((r) => r.operationId === "unpublishPosts")).toBeDefined();
    const publish = routes.find((r) => r.operationId === "publishPosts") as {
      method: string;
      path: string;
    };
    expect(publish.method).toBe("POST");
    expect(publish.path).toBe("/api/posts/:id/publish");
    const unpublish = routes.find((r) => r.operationId === "unpublishPosts") as {
      method: string;
      path: string;
    };
    expect(unpublish.method).toBe("POST");
    expect(unpublish.path).toBe("/api/posts/:id/unpublish");
  });
});

describe("middleware hooks", () => {
  const okHandler = async (): Promise<RouteHandlerResult> => ({
    statusCode: 200,
    body: { ok: true },
  });

  it("passes through when no hooks are provided", async () => {
    const wrapped = applyMiddleware(okHandler, undefined);
    const result = await wrapped({ params: {}, query: {}, body: null, headers: {} });
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ ok: true });
  });

  it("passes through when hooks are empty", async () => {
    const wrapped = applyMiddleware(okHandler, {});
    const result = await wrapped({ params: {}, query: {}, body: null, headers: {} });
    expect(result.statusCode).toBe(200);
  });

  it("runs before hooks before handler", async () => {
    const order: string[] = [];
    const hooks: MiddlewareHooks = {
      before: [
        async () => {
          order.push("before");
        },
      ],
    };
    const wrapped = applyMiddleware(async () => {
      order.push("handler");
      return { statusCode: 200, body: { ok: true } };
    }, hooks);
    await wrapped({ params: {}, query: {}, body: null, headers: {} });
    expect(order).toEqual(["before", "handler"]);
  });

  it("runs after hooks after handler", async () => {
    const order: string[] = [];
    const hooks: MiddlewareHooks = {
      after: [
        async (_ctx: RouteHandlerContext, result: RouteHandlerResult) => {
          order.push("after");
          return result;
        },
      ],
    };
    const wrapped = applyMiddleware(async () => {
      order.push("handler");
      return { statusCode: 200, body: { ok: true } };
    }, hooks);
    await wrapped({ params: {}, query: {}, body: null, headers: {} });
    expect(order).toEqual(["handler", "after"]);
  });

  it("before hook can short-circuit by returning a result", async () => {
    const hooks: MiddlewareHooks = {
      before: [async () => ({ statusCode: 401, body: { error: "Unauthorized" } })],
    };
    const wrapped = applyMiddleware(async () => {
      throw new Error("should not be called");
    }, hooks);
    const result = await wrapped({ params: {}, query: {}, body: null, headers: {} });
    expect(result.statusCode).toBe(401);
    expect(result.body).toEqual({ error: "Unauthorized" });
  });

  it("after hook can modify the result", async () => {
    const hooks: MiddlewareHooks = {
      after: [
        async (_ctx: RouteHandlerContext, result: RouteHandlerResult) => ({
          ...result,
          body: { ...(result.body as Record<string, unknown>), modified: true },
        }),
      ],
    };
    const wrapped = applyMiddleware(async () => ({ statusCode: 200, body: { ok: true } }), hooks);
    const result = await wrapped({ params: {}, query: {}, body: null, headers: {} });
    expect(result.body).toEqual({ ok: true, modified: true });
  });

  it("middleware is applied to all routes via config", async () => {
    const hooks: MiddlewareHooks = {
      before: [async () => ({ statusCode: 403, body: { error: "Forbidden" } })],
    };
    const { routes } = createCollectionRouter(postCollection, mockAdapter, { hooks });
    for (const route of routes) {
      const result = await route.handler({
        params: {},
        query: {},
        body: null,
        headers: {},
      });
      expect(result.statusCode).toBe(403);
      expect(result.body).toEqual({ error: "Forbidden" });
    }
  });
});

describe("createCollectionRouters", () => {
  it("generates routers for multiple collections", () => {
    const userCollection: CollectionDefinition = {
      slug: "users",
      labels: { singular: "User", plural: "Users" },
      fields: [{ name: "email", type: "email" }],
    };
    const routers = createCollectionRouters([postCollection, userCollection], mockAdapter);
    expect(routers).toHaveLength(2);
    const r0 = routers[0] as { routes: { operationId: string }[] };
    const r1 = routers[1] as { routes: { operationId: string }[] };
    expect(r0.routes).toHaveLength(6);
    expect(r1.routes).toHaveLength(6);
    expect(r0.routes[0].operationId).toBe("listPosts");
    expect(r1.routes[0].operationId).toBe("listUsers");
  });
});

const siteSettings: GlobalDefinition = {
  slug: "site-settings",
  label: "Site Settings",
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "description", type: "textarea" },
  ],
};

describe("createGlobalRouter", () => {
  it("generates GET and PUT routes for a global", () => {
    const router = createGlobalRouter(siteSettings, mockAdapter);
    expect(router.routes).toHaveLength(2);

    const get = router.routes.find((r) => r.operationId === "getGlobalSiteSettings") as {
      method: string;
      path: string;
      tags: string[];
    };
    expect(get).toBeDefined();
    expect(get.method).toBe("GET");
    expect(get.path).toBe("/api/globals/site-settings");
    expect(get.tags).toEqual(["Globals"]);

    const put = router.routes.find((r) => r.operationId === "upsertGlobalSiteSettings") as {
      method: string;
      path: string;
      tags: string[];
    };
    expect(put).toBeDefined();
    expect(put.method).toBe("PUT");
    expect(put.path).toBe("/api/globals/site-settings");
    expect(put.tags).toEqual(["Globals"]);
  });

  it("uses custom basePath", () => {
    const router = createGlobalRouter(siteSettings, mockAdapter, { basePath: "/cms/api" });
    for (const route of router.routes) {
      expect(route.path).toMatch(/^\/cms\/api\/globals\//);
    }
  });
});

describe("createGlobalRouters", () => {
  it("generates routers for multiple globals", () => {
    const navSettings: GlobalDefinition = {
      slug: "nav-settings",
      label: "Nav Settings",
      fields: [{ name: "items", type: "json" }],
    };
    const routers = createGlobalRouters([siteSettings, navSettings], mockAdapter);
    expect(routers).toHaveLength(2);
    expect(routers[0].routes).toHaveLength(2);
    expect(routers[1].routes).toHaveLength(2);
    expect(routers[0].routes[0].operationId).toBe("getGlobalSiteSettings");
    expect(routers[1].routes[0].operationId).toBe("getGlobalNavSettings");
  });

  it("passes config to each router", () => {
    const routers = createGlobalRouters([siteSettings], mockAdapter, { basePath: "/custom" });
    expect(routers[0].routes[0].path).toBe("/custom/globals/site-settings");
  });
});
