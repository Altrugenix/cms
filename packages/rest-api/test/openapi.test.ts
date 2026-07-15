import { describe, it, expect } from "vitest";
import type { CollectionDefinition } from "@arche-cms/database";
import { generateOpenApiSpec } from "../src/openapi.js";
import { createCollectionRouter, createCollectionRouters } from "../src/route-generator.js";
import type { DatabaseAdapter } from "@arche-cms/database";

const mockAdapter = {
  findOne: async () => null,
  findMany: async () => ({ data: [], total: 0 }),
  create: async () => ({}),
  update: async () => null,
  delete: async () => true,
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
    { name: "views", type: "number" },
    { name: "published", type: "boolean" },
    {
      name: "status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    },
    {
      name: "tags",
      type: "multiSelect",
      options: [
        { label: "News", value: "news" },
        { label: "Tech", value: "tech" },
      ],
    },
    { name: "author", type: "relation", to: "users" },
    { name: "publishedAt", type: "datetime" },
  ],
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
      slug: "users",
      labels: { singular: "User", plural: "Users" },
      fields: [{ name: "email", type: "email" }],
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
      slug: "settings",
      labels: { singular: "Setting", plural: "Settings" },
      fields: [
        { name: "metadata", type: "json" },
        { name: "active", type: "checkbox" },
      ],
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
        method: "POST" as const,
        path: "/api/posts",
        operationId: "createPosts",
        summary: "Create a post",
        tags: ["Posts"],
        handler: async () => ({ statusCode: 201, body: {} }),
      },
    ];
    const spec = generateOpenApiSpec([postCollection], routes);
    const paths = spec.paths as Record<string, Record<string, unknown>>;
    const postOp = paths["/api/posts"].post as Record<string, unknown>;
    const responses = postOp.responses as Record<string, unknown>;
    expect(responses["201"]).toBeDefined();
    expect(responses["400"]).toBeDefined();
  });

  it("handles date field type", () => {
    const col: CollectionDefinition = {
      slug: "events",
      labels: { singular: "Event", plural: "Events" },
      fields: [{ name: "eventDate", type: "date" }],
    };
    const { routes } = createCollectionRouter(col, mockAdapter);
    const spec = generateOpenApiSpec([col], routes);
    const schemas = (spec.components as Record<string, unknown>).schemas as Record<string, unknown>;
    const properties = (schemas.EventsResponse as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    expect((properties.eventDate as Record<string, unknown>).type).toBe("string");
    expect((properties.eventDate as Record<string, unknown>).format).toBe("date-time");
  });

  it("excludes timestamps when disabled", () => {
    const col: CollectionDefinition = {
      slug: "no-ts",
      labels: { singular: "No Ts", plural: "No Ts" },
      fields: [{ name: "title", type: "text" }],
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
      slug: "partial-ts",
      labels: { singular: "Partial Ts", plural: "Partial Ts" },
      fields: [{ name: "title", type: "text" }],
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
      slug: "partial-ts2",
      labels: { singular: "Partial Ts2", plural: "Partial Ts2" },
      fields: [{ name: "title", type: "text" }],
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
        method: "GET" as const,
        path: "/api/posts/:id",
        operationId: "getPosts",
        summary: "Get a post",
        tags: ["Posts"],
        handler: async () => ({ statusCode: 200, body: {} }),
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
        method: "GET" as const,
        path: "/api/posts",
        operationId: "listPosts",
        summary: "List posts",
        tags: ["Posts"],
        handler: async () => ({ statusCode: 200, body: {} }),
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
