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
});
