import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import { adminFormGenerator } from "../src/admin-forms.js";
import { apiRoutesGenerator } from "../src/api-routes.js";
import { graphqlGenerator } from "../src/graphql-schema.js";
import { migrationGenerator } from "../src/migrations.js";
import { openApiGenerator } from "../src/openapi.js";
import { GenerationPipeline } from "../src/pipeline.js";
import { sdkGenerator } from "../src/sdk.js";
import { validationGenerator } from "../src/validation.js";

const sampleCollections: CollectionDefinition[] = [
  {
    fields: [
      { label: "Title", name: "title", type: "text", validation: { required: true } },
      { name: "body", type: "richText" },
      { name: "author", to: "users", type: "relation" },
      { label: "Status", name: "status", options: ["draft", "published"], type: "select" },
    ],
    labels: { plural: "Posts", singular: "Post" },
    slug: "posts",
  },
  {
    fields: [
      { name: "email", type: "email", validation: { required: true } },
      { name: "name", type: "text" },
    ],
    labels: { plural: "Users", singular: "User" },
    slug: "users",
  },
];

describe("apiRoutesGenerator", () => {
  it("generates route registration file", async () => {
    const files = await apiRoutesGenerator.generate({
      collections: sampleCollections,
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("routes/index.ts");
    expect(files[0]?.content).toContain("registerGeneratedRoutes");
    expect(files[0]?.content).toContain("createCollectionRouter");
    expect(files[0]?.content).toContain("posts");
    expect(files[0]?.content).toContain("users");
  });

  it("returns empty array when no collections", async () => {
    const files = await apiRoutesGenerator.generate({ outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });
});

describe("validationGenerator", () => {
  it("generates validation schema file", async () => {
    const files = await validationGenerator.generate({
      collections: sampleCollections,
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("validation/index.ts");
    expect(files[0]?.content).toContain("fieldToZodSchema");
    expect(files[0]?.content).toContain("postsCreateSchema");
    expect(files[0]?.content).toContain("postsUpdateSchema");
    expect(files[0]?.content).toContain("usersCreateSchema");
  });
});

describe("migrationGenerator", () => {
  it("generates migration file", async () => {
    const files = await migrationGenerator.generate({
      collections: sampleCollections,
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toContain("migrations/");
    expect(files[0]?.content).toContain("CREATE TABLE IF NOT EXISTS __cms_posts");
    expect(files[0]?.content).toContain("CREATE TABLE IF NOT EXISTS __cms_users");
    expect(files[0]?.content).toContain("DROP TABLE IF EXISTS __cms_posts");
    expect(files[0]?.content).toContain("title TEXT");
    expect(files[0]?.content).toContain("email TEXT");
  });
});

describe("graphqlGenerator", () => {
  it("generates schema.graphql and resolvers.ts", async () => {
    const files = await graphqlGenerator.generate({
      collections: sampleCollections,
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(2);

    const schemaFile = files.find((f) => f.path === "graphql/schema.graphql");
    const resolversFile = files.find((f) => f.path === "graphql/resolvers.ts");
    expect(schemaFile).toBeDefined();
    expect(resolversFile).toBeDefined();

    expect(schemaFile?.content).toContain("type Posts {");
    expect(schemaFile?.content).toContain("type Users {");
    expect(schemaFile?.content).toContain(
      "listPosts(filter: PostsFilter, sort: PostsSort, limit: Int, offset: Int): PostsConnection!",
    );
    expect(schemaFile?.content).toContain("createPosts(input: PostsCreateInput!): Posts");

    expect(resolversFile?.content).toContain("createResolvers");
    expect(resolversFile?.content).toContain('adapter.findOne("posts"');
    expect(resolversFile?.content).toContain('adapter.findOne("users"');
  });
});

describe("openApiGenerator", () => {
  it("generates valid OpenAPI JSON", async () => {
    const files = await openApiGenerator.generate({
      collections: sampleCollections,
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("openapi.json");

    const spec = JSON.parse(files[0]?.content ?? "null");
    expect(spec?.openapi).toBe("3.1.0");
    expect(spec?.info?.title).toBe("Arche CMS API");
    expect(spec?.paths?.["/api/collections/posts"]).toBeDefined();
    expect(spec?.paths?.["/api/collections/posts/{id}"]).toBeDefined();
    expect(spec?.paths?.["/api/collections/users"]).toBeDefined();
    expect(spec?.components?.schemas?.Posts).toBeDefined();
    expect(spec?.components?.schemas?.Users).toBeDefined();
  });
});

describe("sdkGenerator", () => {
  it("generates SDK client class", async () => {
    const files = await sdkGenerator.generate({
      collections: sampleCollections,
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("sdk/index.ts");
    expect(files[0]?.content).toContain("class ArcheCMSClient");
    expect(files[0]?.content).toContain("getPosts");
    expect(files[0]?.content).toContain("listPosts");
    expect(files[0]?.content).toContain("createPosts");
    expect(files[0]?.content).toContain("updatePosts");
    expect(files[0]?.content).toContain("deletePosts");
    expect(files[0]?.content).toContain("getUsers");
    expect(files[0]?.content).toContain("interface Posts");
    expect(files[0]?.content).toContain("interface Users");
  });
});

describe("adminFormGenerator", () => {
  it("generates admin form configs", async () => {
    const files = await adminFormGenerator.generate({
      collections: sampleCollections,
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("admin-forms/index.ts");
    expect(files[0]?.content).toContain("postsFormConfig");
    expect(files[0]?.content).toContain("usersFormConfig");
    expect(files[0]?.content).toContain('input: "text"');
    expect(files[0]?.content).toContain('input: "email"');
    expect(files[0]?.content).toContain('input: "richText"');
    expect(files[0]?.content).toContain('input: "select"');
    expect(files[0]?.content).toContain('input: "relation"');
    expect(files[0]?.content).toContain("required: true");
  });
});

describe("GenerationPipeline", () => {
  it("registers and runs multiple generators", async () => {
    const pipeline = new GenerationPipeline();
    pipeline.register(apiRoutesGenerator);
    pipeline.register(sdkGenerator);

    await expect(
      pipeline.run({ collections: sampleCollections, outputDir: "/tmp" }),
    ).resolves.toBeUndefined();
  });
});

describe("allGenerators", () => {
  it("exports all 7 generators", async () => {
    const { allGenerators } = await import("../src/index.js");
    expect(allGenerators).toHaveLength(7);
    const names = allGenerators.map((g: { name: string }) => g.name);
    expect(names).toContain("api-routes");
    expect(names).toContain("validation");
    expect(names).toContain("migrations");
    expect(names).toContain("graphql");
    expect(names).toContain("openapi");
    expect(names).toContain("sdk");
    expect(names).toContain("admin-forms");
  });
});
