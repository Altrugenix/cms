import type { CollectionDefinition } from "@arche-cms/database";
import type { DatabaseAdapter } from "@arche-cms/database";

import { describe, it, expect } from "vitest";

import { generateOpenApiSpec } from "../src/openapi.js";
import { createCollectionRouter, createCollectionRouters } from "../src/route-generator.js";

const mockAdapter = {
  connect: async () => {},
  create: async () => ({}),
  createTable: async () => {},
  delete: async () => true,
  disconnect: async () => {},
  dropTable: async () => {},
  findMany: async () => ({ data: [], total: 0 }),
  findOne: async () => null,
  getExecutedMigrations: async () => [],
  raw: async () => [],
  runMigration: async () => {},
  transaction: async <T>(fn: () => Promise<T>) => fn(),
  update: async () => null,
} satisfies DatabaseAdapter;

const postCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "body", type: "richText" },
    { name: "views", type: "number" },
    { name: "published", type: "boolean" },
    {
      name: "status",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      type: "select",
    },
    {
      name: "tags",
      options: [
        { label: "News", value: "news" },
        { label: "Tech", value: "tech" },
      ],
      type: "multiSelect",
    },
    { name: "author", to: "users", type: "relation" },
    { name: "publishedAt", type: "datetime" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

describe("generateOpenApiSpec", () => {
  it("generates a valid OpenAPI 3.1 spec", () => {
    const collectionRouter = createCollectionRouter(postCollection, mockAdapter);
    const spec = generateOpenApiSpec([postCollection], collectionRouter.routes);
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("Arche CMS API");
    expect(spec.info.version).toBe("0.1.0");
  });

  it("includes paths for all CRUD routes", () => {
    const collectionRouter = createCollectionRouter(postCollection, mockAdapter);
    const spec = generateOpenApiSpec([postCollection], collectionRouter.routes);
    const paths = spec.paths as Record<string, unknown>;
    expect(paths["/api/posts"]).toBeDefined();
    expect(paths["/api/posts/:id"]).toBeDefined();
  });

  it("includes component schemas for the collection", () => {
    const collectionRouter = createCollectionRouter(postCollection, mockAdapter);
    const spec = generateOpenApiSpec([postCollection], collectionRouter.routes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    expect(schemas.PostsResponse).toBeDefined();
    expect(schemas.PostsCreate).toBeDefined();
    expect(schemas.PostsUpdate).toBeDefined();
  });

  it("maps field types correctly in response schema", () => {
    const collectionRouter = createCollectionRouter(postCollection, mockAdapter);
    const spec = generateOpenApiSpec([postCollection], collectionRouter.routes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    const responseSchema = schemas.PostsResponse as Record<string, unknown>;
    const properties = responseSchema.properties as Record<string, unknown>;
    expect((properties.title as Record<string, unknown>).type).toBe("string");
    expect((properties.views as Record<string, unknown>).type).toBe("number");
    expect((properties.published as Record<string, unknown>).type).toBe("boolean");
  });

  it("uses custom title and version", () => {
    const collectionRouter = createCollectionRouter(postCollection, mockAdapter);
    const spec = generateOpenApiSpec([postCollection], collectionRouter.routes, {
      title: "My CMS",
      version: "2.0.0",
    });
    expect(spec.info.title).toBe("My CMS");
    expect(spec.info.version).toBe("2.0.0");
  });

  it("generates spec for multiple collections", () => {
    const userCollection: CollectionDefinition = {
      fields: [{ name: "email", type: "email" }],
      labels: { plural: "Users", singular: "User" },
      slug: "users",
    };
    const routers = createCollectionRouters([postCollection, userCollection], mockAdapter);
    const allRoutes = routers.flatMap((r) => r.routes);
    const spec = generateOpenApiSpec([postCollection, userCollection], allRoutes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    expect(schemas.PostsResponse).toBeDefined();
    expect(schemas.UsersResponse).toBeDefined();
    const paths = spec.paths as Record<string, unknown>;
    expect(paths["/api/users"]).toBeDefined();
  });

  it("handles json and checkbox field types", () => {
    const col: CollectionDefinition = {
      fields: [
        { name: "metadata", type: "json" },
        { name: "active", type: "checkbox" },
      ],
      labels: { plural: "Settings", singular: "Setting" },
      slug: "settings",
    };
    const { routes } = createCollectionRouter(col, mockAdapter);
    const spec = generateOpenApiSpec([col], routes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    const responseSchema = schemas.SettingsResponse as Record<string, unknown>;
    const properties = responseSchema.properties as Record<string, unknown>;
    expect((properties.metadata as Record<string, unknown>).type).toBe("object");
    expect((properties.active as Record<string, unknown>).type).toBe("boolean");
  });

  it("uses custom description", () => {
    const spec = generateOpenApiSpec([], [], { description: "My API" });
    expect(spec.info.description).toBe("My API");
  });

  it("handles POST route responses correctly", () => {
    const routes = [
      {
        handler: async () => ({ body: {}, statusCode: 201 }),
        method: "POST" as const,
        operationId: "createPosts",
        path: "/api/posts",
        summary: "Create a post",
        tags: ["Posts"],
      },
    ];
    const spec = generateOpenApiSpec([postCollection], routes);
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const postOp = paths["/api/posts"].post as Record<string, unknown>;
    const responses = postOp.responses as Record<string, unknown>;
    expect(responses["201"]).toBeDefined();
    expect(responses["400"]).toBeDefined();
  });

  it("includes requestBody for POST operations", () => {
    const routes = [
      {
        handler: async () => ({ body: {}, statusCode: 201 }),
        method: "POST" as const,
        operationId: "createPosts",
        path: "/api/posts",
        summary: "Create a post",
        tags: ["Posts"],
      },
    ];
    const spec = generateOpenApiSpec([postCollection], routes);
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const postOp = paths["/api/posts"].post as Record<string, unknown>;
    expect(postOp.requestBody).toBeDefined();
    const requestBody = postOp.requestBody as Record<string, unknown>;
    expect(requestBody.content).toBeDefined();
    const json = (requestBody.content as Record<string, Record<string, unknown>>)[
      "application/json"
    ];
    expect(json.schema).toBeDefined();
  });

  it("includes requestBody for PATCH operations", () => {
    const routes = [
      {
        handler: async () => ({ body: {}, statusCode: 200 }),
        method: "PATCH" as const,
        operationId: "updatePosts",
        path: "/api/posts/:id",
        summary: "Update a post",
        tags: ["Posts"],
      },
    ];
    const spec = generateOpenApiSpec([postCollection], routes);
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const patchOp = paths["/api/posts/:id"].patch as Record<string, unknown>;
    expect(patchOp.requestBody).toBeDefined();
  });

  it("includes requestBody for PUT operations", () => {
    const routes = [
      {
        handler: async () => ({ body: {}, statusCode: 200 }),
        method: "PUT" as const,
        operationId: "upsertPosts",
        path: "/api/posts",
        summary: "Upsert a post",
        tags: ["Posts"],
      },
    ];
    const spec = generateOpenApiSpec([postCollection], routes);
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const putOp = paths["/api/posts"].put as Record<string, unknown>;
    expect(putOp.requestBody).toBeDefined();
  });

  it("includes textarea, code, slug, markdown field types", () => {
    const col: CollectionDefinition = {
      fields: [
        { name: "bio", type: "textarea" },
        { name: "snippet", type: "code" },
        { name: "slug", type: "slug" },
        { name: "content", type: "markdown" },
      ],
      labels: { plural: "Pages", singular: "Page" },
      slug: "pages",
    };
    const { routes } = createCollectionRouter(col, mockAdapter);
    const spec = generateOpenApiSpec([col], routes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    const properties = (schemas.PagesResponse as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    expect((properties.bio as Record<string, unknown>).type).toBe("string");
    expect((properties.bio as Record<string, unknown>).format).toBe("textarea");
    expect((properties.snippet as Record<string, unknown>).type).toBe("string");
    expect((properties.snippet as Record<string, unknown>).format).toBe("code");
    expect((properties.slug as Record<string, unknown>).type).toBe("string");
    expect((properties.slug as Record<string, unknown>).format).toBe("slug");
    expect((properties.content as Record<string, unknown>).type).toBe("string");
    expect((properties.content as Record<string, unknown>).format).toBe("markdown");
  });

  it("includes VersionResponse schema", () => {
    const col: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
      versions: { drafts: true },
    };
    const { routes } = createCollectionRouter(col, mockAdapter);
    const spec = generateOpenApiSpec([col], routes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    expect(schemas.VersionResponse).toBeDefined();
    const versionSchema = schemas.VersionResponse as Record<string, unknown>;
    expect((versionSchema.properties as Record<string, unknown>).id).toBeDefined();
    expect((versionSchema.properties as Record<string, unknown>).version).toBeDefined();
    expect((versionSchema.properties as Record<string, unknown>).data).toBeDefined();
  });

  it("list versions route has id parameter", () => {
    const routes = [
      {
        handler: async () => ({ body: [], statusCode: 200 }),
        method: "GET" as const,
        operationId: "listPostsVersions",
        path: "/api/posts/:id/versions",
        summary: "List versions",
        tags: ["Posts"],
      },
    ];
    const spec = generateOpenApiSpec([postCollection], routes);
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const getOp = paths["/api/posts/:id/versions"].get as Record<string, unknown>;
    const parameters = getOp.parameters as Array<Record<string, unknown>>;
    expect(parameters).toHaveLength(1);
    expect(parameters[0].name).toBe("id");
  });

  it("handles date field type", () => {
    const col: CollectionDefinition = {
      fields: [{ name: "eventDate", type: "date" }],
      labels: { plural: "Events", singular: "Event" },
      slug: "events",
    };
    const { routes } = createCollectionRouter(col, mockAdapter);
    const spec = generateOpenApiSpec([col], routes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    const properties = (schemas.EventsResponse as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    expect((properties.eventDate as Record<string, unknown>).type).toBe("string");
    expect((properties.eventDate as Record<string, unknown>).format).toBe("date");
  });

  it("excludes timestamps when disabled", () => {
    const col: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "No Ts", singular: "No Ts" },
      slug: "no-ts",
      timestamps: { createdAt: false, updatedAt: false },
    };
    const { routes } = createCollectionRouter(col, mockAdapter);
    const spec = generateOpenApiSpec([col], routes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    const properties = (schemas.NoTsResponse as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    expect(properties.createdAt).toBeUndefined();
    expect(properties.updatedAt).toBeUndefined();
  });

  it("includes only createdAt when updatedAt is disabled", () => {
    const col: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Partial Ts", singular: "Partial Ts" },
      slug: "partial-ts",
      timestamps: { updatedAt: false },
    };
    const { routes } = createCollectionRouter(col, mockAdapter);
    const spec = generateOpenApiSpec([col], routes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    const properties = (schemas.PartialTsResponse as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    expect(properties.createdAt).toBeDefined();
    expect(properties.updatedAt).toBeUndefined();
  });

  it("includes only updatedAt when createdAt is disabled", () => {
    const col: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Partial Ts2", singular: "Partial Ts2" },
      slug: "partial-ts2",
      timestamps: { createdAt: false },
    };
    const { routes } = createCollectionRouter(col, mockAdapter);
    const spec = generateOpenApiSpec([col], routes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    const properties = (schemas.PartialTs2Response as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    expect(properties.createdAt).toBeUndefined();
    expect(properties.updatedAt).toBeDefined();
  });

  it("handles GET single route with id parameter", () => {
    const routes = [
      {
        handler: async () => ({ body: {}, statusCode: 200 }),
        method: "GET" as const,
        operationId: "getPosts",
        path: "/api/posts/:id",
        summary: "Get a post",
        tags: ["Posts"],
      },
    ];
    const spec = generateOpenApiSpec([postCollection], routes);
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const getOp = paths["/api/posts/:id"].get as Record<string, unknown>;
    const parameters = getOp.parameters as Array<Record<string, unknown>>;
    expect(parameters).toHaveLength(1);
    expect(parameters[0].name).toBe("id");
    expect(parameters[0].in).toBe("path");
  });

  it("handles GET list route with query parameters", () => {
    const routes = [
      {
        handler: async () => ({ body: {}, statusCode: 200 }),
        method: "GET" as const,
        operationId: "listPosts",
        path: "/api/posts",
        summary: "List posts",
        tags: ["Posts"],
      },
    ];
    const spec = generateOpenApiSpec([postCollection], routes);
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const getOp = paths["/api/posts"].get as Record<string, unknown>;
    const parameters = getOp.parameters as Array<Record<string, unknown>>;
    expect(parameters.length).toBeGreaterThan(0);
    expect(parameters.find((p) => p.name === "limit")).toBeDefined();
    expect(parameters.find((p) => p.name === "offset")).toBeDefined();
    expect(parameters.find((p) => p.name === "sort")).toBeDefined();
  });
});
