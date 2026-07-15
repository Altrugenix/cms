import { describe, it, expect } from "vitest";
import type { CollectionDefinition } from "@arche-cms/types";
import { adminFormGenerator } from "../src/admin-forms.js";
import { migrationGenerator } from "../src/migrations.js";
import { sdkGenerator } from "../src/sdk.js";
import { openApiGenerator } from "../src/openapi.js";
import { validationGenerator } from "../src/validation.js";
import { apiRoutesGenerator } from "../src/api-routes.js";
import { graphqlGenerator } from "../src/graphql-schema.js";

const allFieldTypesCollection: CollectionDefinition = {
  slug: "all-fields",
  labels: { singular: "All Field", plural: "All Fields" },
  fields: [
    { name: "f_text", type: "text" },
    { name: "f_textarea", type: "textarea" },
    { name: "f_number", type: "number" },
    { name: "f_boolean", type: "boolean" },
    { name: "f_date", type: "date" },
    { name: "f_datetime", type: "datetime" },
    { name: "f_email", type: "email" },
    { name: "f_password", type: "password" },
    { name: "f_url", type: "url" },
    { name: "f_json", type: "json" },
    { name: "f_richText", type: "richText" },
    { name: "f_markdown", type: "markdown" },
    { name: "f_code", type: "code" },
    { name: "f_color", type: "color" },
    { name: "f_media", type: "media" },
    { name: "f_upload", type: "upload" },
    { name: "f_select", type: "select", options: [{ label: "A", value: "a" }] },
    { name: "f_multiSelect", type: "multiSelect", options: [{ label: "B", value: "b" }] },
    { name: "f_radio", type: "radio", options: [{ label: "C", value: "c" }] },
    { name: "f_checkbox", type: "checkbox" },
    { name: "f_slug", type: "slug" },
    { name: "f_relation", type: "relation", to: "other" },
    { name: "f_component", type: "component", component: "seo" },
  ],
};

describe("adminFormGenerator - field type coverage", () => {
  it("handles all field types in the switch", async () => {
    const files = await adminFormGenerator.generate({
      collections: [allFieldTypesCollection],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";
    expect(content).toContain('input: "text"');
    expect(content).toContain('input: "textarea"');
    expect(content).toContain('input: "number"');
    expect(content).toContain('input: "checkbox"');
    expect(content).toContain('input: "date"');
    expect(content).toContain('input: "datetime"');
    expect(content).toContain('input: "email"');
    expect(content).toContain('input: "password"');
    expect(content).toContain('input: "url"');
    expect(content).toContain('input: "json"');
    expect(content).toContain('input: "richText"');
    expect(content).toContain('input: "markdown"');
    expect(content).toContain('input: "code"');
    expect(content).toContain('input: "color"');
    expect(content).toContain('input: "media"');
    expect(content).toContain('input: "select"');
    expect(content).toContain('input: "multiSelect"');
    expect(content).toContain('input: "radio"');
    expect(content).toContain('input: "slug"');
    expect(content).toContain('input: "relation"');
  });

  it("returns empty for no collections", async () => {
    const files = await adminFormGenerator.generate({ outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("returns empty for empty collections array", async () => {
    const files = await adminFormGenerator.generate({ collections: [], outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("handles field with label", async () => {
    const col: CollectionDefinition = {
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "title", type: "text", label: "Title", validation: { required: true } }],
    };
    const files = await adminFormGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain('"Title"');
    expect(content).toContain("required: true");
  });

  it("handles unknown field type via default", async () => {
    const col: CollectionDefinition = {
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "custom", type: "unknown-type" as never }],
    };
    const files = await adminFormGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain('input: "text"');
  });
});

describe("migrationGenerator - field type coverage", () => {
  it("handles all column types in the switch", async () => {
    const files = await migrationGenerator.generate({
      collections: [allFieldTypesCollection],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";
    expect(content).toContain("f_text TEXT");
    expect(content).toContain("f_textarea TEXT");
    expect(content).toContain("f_number REAL");
    expect(content).toContain("f_boolean INTEGER");
    expect(content).toContain("f_date TEXT");
    expect(content).toContain("f_datetime TEXT");
    expect(content).toContain("f_email TEXT");
    expect(content).toContain("f_password TEXT");
    expect(content).toContain("f_url TEXT");
    expect(content).toContain("f_json TEXT");
    expect(content).toContain("f_richText TEXT");
    expect(content).toContain("f_markdown TEXT");
    expect(content).toContain("f_code TEXT");
    expect(content).toContain("f_color TEXT");
    expect(content).toContain("f_media TEXT");
    expect(content).toContain("f_upload TEXT");
    expect(content).toContain("f_select TEXT");
    expect(content).toContain("f_multiSelect TEXT");
    expect(content).toContain("f_radio TEXT");
    expect(content).toContain("f_checkbox INTEGER");
    expect(content).toContain("f_slug TEXT");
    expect(content).toContain("f_relation TEXT");
    // component fields are skipped in migration output
  });

  it("skips component, dynamicZone, array, repeater, tabs, object, group fields", async () => {
    const col: CollectionDefinition = {
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [
        { name: "title", type: "text" },
        { name: "comp", type: "component", component: "seo" },
        { name: "dz", type: "dynamicZone", components: ["comp1", "comp2"] },
        { name: "arr", type: "array", fields: [{ name: "item", type: "text" }] },
        { name: "rep", type: "repeater", fields: [{ name: "item", type: "text" }] },
        {
          name: "tab_fields",
          type: "tabs",
          tabs: [{ label: "Tab1", fields: [{ name: "x", type: "text" }] }],
        },
        { name: "obj", type: "object", fields: [{ name: "nested", type: "text" }] },
        { name: "grp", type: "group", fields: [{ name: "inner", type: "text" }] },
      ],
    };
    const files = await migrationGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("title TEXT");
    expect(content).not.toContain("comp TEXT");
    expect(content).not.toContain("dz TEXT");
    expect(content).not.toContain("arr TEXT");
    expect(content).not.toContain("rep TEXT");
    expect(content).not.toContain("tab_fields TEXT");
    expect(content).not.toContain("obj TEXT");
    expect(content).not.toContain("grp TEXT");
  });

  it("returns empty for no collections", async () => {
    const files = await migrationGenerator.generate({ outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("returns empty for empty collections array", async () => {
    const files = await migrationGenerator.generate({ collections: [], outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("generates valid migration date prefix", async () => {
    const files = await migrationGenerator.generate({
      collections: [allFieldTypesCollection],
      outputDir: "/tmp",
    });
    expect(files[0]?.path).toMatch(/migrations\/\d{4}-\d{2}-\d{2}_initial_schema\.ts/);
    expect(files[0]?.content).toContain("export default migration");
  });
});

describe("sdkGenerator - field type coverage", () => {
  it("handles all SDK field types", async () => {
    const files = await sdkGenerator.generate({
      collections: [
        {
          slug: "items",
          labels: { singular: "Item", plural: "Items" },
          fields: [
            { name: "title", type: "text" },
            { name: "count", type: "number" },
            { name: "active", type: "boolean" },
            { name: "meta", type: "json" },
            { name: "body", type: "richText" },
            { name: "tags", type: "multiSelect" },
            { name: "author", type: "relation", to: "users" },
            { name: "publishedAt", type: "date" },
            { name: "createdAt", type: "datetime" },
          ],
        },
      ],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";
    expect(content).toContain("class ArcheCMSClient");
    expect(content).toContain("interface Items");
    expect(content).toContain("count?: number;");
    expect(content).toContain("active?: boolean;");
    expect(content).toContain("meta?: Record<string, unknown>;");
    expect(content).toContain("body?: unknown;");
    expect(content).toContain("tags?: string[];");
    expect(content).toContain("author?: string;");
    expect(content).toContain("publishedAt?: string;");
    expect(content).toContain("createdAt?: string;");
  });

  it("returns empty for no collections", async () => {
    const files = await sdkGenerator.generate({ outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("returns empty for empty collections array", async () => {
    const files = await sdkGenerator.generate({ collections: [], outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("handles required fields in interface", async () => {
    const files = await sdkGenerator.generate({
      collections: [
        {
          slug: "posts",
          labels: { singular: "Post", plural: "Posts" },
          fields: [
            { name: "title", type: "text", validation: { required: true } },
            { name: "slug", type: "slug", validation: { required: true } },
          ],
        },
      ],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("title: string;");
    expect(content).toContain("slug: string;");
  });
});

describe("openApiGenerator (generators) - field type coverage", () => {
  it("handles all OpenAPI schema types", async () => {
    const files = await openApiGenerator.generate({
      collections: [
        {
          slug: "items",
          labels: { singular: "Item", plural: "Items" },
          fields: [
            { name: "count", type: "number" },
            { name: "active", type: "boolean" },
            { name: "meta", type: "json" },
            { name: "body", type: "richText" },
            { name: "tags", type: "multiSelect" },
            { name: "title", type: "text" },
          ],
        },
      ],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    const spec = JSON.parse(files[0]?.content ?? "null");
    expect(spec.openapi).toBe("3.1.0");
    const schemas = spec.components.schemas.Items;
    expect(schemas.properties.count.type).toBe("number");
    expect(schemas.properties.active.type).toBe("boolean");
    expect(schemas.properties.meta.type).toBe("object");
    expect(schemas.properties.body.type).toBe("object");
    expect(schemas.properties.tags.type).toBe("array");
    expect(schemas.properties.tags.items.type).toBe("string");
    expect(schemas.properties.title.type).toBe("string");
  });

  it("returns empty for no collections", async () => {
    const files = await openApiGenerator.generate({ outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("returns empty for empty collections array", async () => {
    const files = await openApiGenerator.generate({ collections: [], outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });
});

describe("validationGenerator - field type coverage", () => {
  it("returns empty for no collections", async () => {
    const files = await validationGenerator.generate({ outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("returns empty for empty collections array", async () => {
    const files = await validationGenerator.generate({ collections: [], outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("generates validation with all value types in jsValue", async () => {
    const files = await validationGenerator.generate({
      collections: [
        {
          slug: "items",
          labels: { singular: "Item", plural: "Items" },
          fields: [
            { name: "title", type: "text" },
            { name: "count", type: "number" },
            { name: "active", type: "boolean" },
            { name: "tags", type: "multiSelect" },
          ],
        },
      ],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";
    expect(content).toContain("itemsCreateSchema");
    expect(content).toContain("itemsUpdateSchema");
    expect(content).toContain("import { z }");
  });
});

describe("apiRoutesGenerator - field type coverage", () => {
  it("returns empty for no collections", async () => {
    const files = await apiRoutesGenerator.generate({ outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("returns empty for empty collections array", async () => {
    const files = await apiRoutesGenerator.generate({ collections: [], outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("generates route file with correct imports", async () => {
    const files = await apiRoutesGenerator.generate({
      collections: [
        {
          slug: "posts",
          labels: { singular: "Post", plural: "Posts" },
          fields: [{ name: "title", type: "text" }],
        },
      ],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";
    expect(content).toContain("FastifyInstance");
    expect(content).toContain("DatabaseAdapter");
    expect(content).toContain("createCollectionRouter");
  });

  it("handles hyphenated slugs in route variable names", async () => {
    const files = await apiRoutesGenerator.generate({
      collections: [
        {
          slug: "blog-posts",
          labels: { singular: "Blog Post", plural: "Blog Posts" },
          fields: [{ name: "title", type: "text" }],
        },
      ],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("blog_posts");
  });
});

describe("graphqlGenerator - field type coverage", () => {
  it("returns empty for no collections", async () => {
    const files = await graphqlGenerator.generate({ outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("returns empty for empty collections array", async () => {
    const files = await graphqlGenerator.generate({ collections: [], outputDir: "/tmp" });
    expect(files).toHaveLength(0);
  });

  it("handles component, dynamicZone, and unknown field types", async () => {
    const files = await graphqlGenerator.generate({
      collections: [
        {
          slug: "pages",
          labels: { singular: "Page", plural: "Pages" },
          fields: [
            { name: "title", type: "text", validation: { required: true } },
            { name: "seo", type: "component", component: "seo" },
            { name: "content", type: "dynamicZone", components: ["hero", "text"] },
            { name: "author", type: "relation", to: "users" },
            { name: "count", type: "number" },
            { name: "active", type: "boolean" },
            { name: "tags", type: "multiSelect" },
          ],
        },
      ],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(2);
    const schemaFile = files.find((f) => f.path === "graphql/schema.graphql");
    expect(schemaFile).toBeDefined();
    const content = schemaFile?.content ?? "";
    expect(content).toContain("type Pages {");
    expect(content).toContain("title: String!");
    expect(content).toContain("seo: Seo");
    expect(content).toContain("content: Hero | Text");
    expect(content).toContain("author: Users");
    expect(content).toContain("count: Float");
    expect(content).toContain("active: Boolean");
    expect(content).toContain("tags: [String]");
  });

  it("handles unknown field type via default", async () => {
    const files = await graphqlGenerator.generate({
      collections: [
        {
          slug: "test",
          labels: { singular: "Test", plural: "Tests" },
          fields: [{ name: "custom", type: "unknown-type" as never }],
        },
      ],
      outputDir: "/tmp",
    });
    const schemaFile = files.find((f) => f.path === "graphql/schema.graphql");
    const content = schemaFile?.content ?? "";
    expect(content).toContain("custom: String");
  });

  it("generates resolvers with correct CRUD operations", async () => {
    const files = await graphqlGenerator.generate({
      collections: [
        {
          slug: "posts",
          labels: { singular: "Post", plural: "Posts" },
          fields: [{ name: "title", type: "text" }],
        },
      ],
      outputDir: "/tmp",
    });
    const resolversFile = files.find((f) => f.path === "graphql/resolvers.ts");
    expect(resolversFile).toBeDefined();
    const content = resolversFile?.content ?? "";
    expect(content).toContain("createResolvers");
    expect(content).toContain("posts: async");
    expect(content).toContain("allPosts: async");
    expect(content).toContain("createPosts: async");
    expect(content).toContain("updatePosts: async");
    expect(content).toContain("deletePosts: async");
  });

  it("handles component field with undefined component value", async () => {
    const files = await graphqlGenerator.generate({
      collections: [
        {
          slug: "test",
          labels: { singular: "Test", plural: "Tests" },
          fields: [{ name: "comp", type: "component", component: undefined as unknown as string }],
        },
      ],
      outputDir: "/tmp",
    });
    const schemaFile = files.find((f) => f.path === "graphql/schema.graphql");
    expect(schemaFile).toBeDefined();
    expect(schemaFile?.content).toContain("comp: ");
  });
});

describe("apiRoutesGenerator - jsValue fallback coverage", () => {
  it("covers String(val) fallback for non-serializable values", async () => {
    const col = {
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "title", type: "text" }],
      customProp: () => "fn",
    } as unknown as import("../src/types.js").CollectionDefinition;
    const files = await apiRoutesGenerator.generate({
      collections: [col],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    expect(files[0]?.content).toContain("registerGeneratedRoutes");
  });

  it("covers undefined and null branch values in jsValue", async () => {
    const col = {
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "title", type: "text" }],
      nullProp: null,
    } as unknown as import("../src/types.js").CollectionDefinition;
    const files = await apiRoutesGenerator.generate({
      collections: [col],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";
    expect(content).toContain('"nullProp": null');
  });
});

describe("validationGenerator - jsValue fallback coverage", () => {
  it("covers String(val) fallback for non-serializable values", async () => {
    const col = {
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "title", type: "text" }],
      customProp: () => "fn",
    } as unknown as import("../src/types.js").CollectionDefinition;
    const files = await validationGenerator.generate({
      collections: [col],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    expect(files[0]?.content).toContain("testCreateSchema");
  });

  it("covers undefined and null branch values in jsValue", async () => {
    const col = {
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "title", type: "text" }],
      nullProp: null,
    } as unknown as import("../src/types.js").CollectionDefinition;
    const files = await validationGenerator.generate({
      collections: [col],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";
    expect(content).toContain('"nullProp": null');
  });

  it("covers empty object branch in jsValue", async () => {
    const col = {
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "title", type: "text" }],
      emptyObj: {},
    } as unknown as import("../src/types.js").CollectionDefinition;
    const files = await validationGenerator.generate({
      collections: [col],
      outputDir: "/tmp",
    });
    expect(files).toHaveLength(1);
    const content = files[0]?.content ?? "";
    expect(content).toContain('"emptyObj": {}');
  });
});

describe("migrationGenerator - default case and component case coverage", () => {
  it("hits default case for unknown field types", async () => {
    const col: CollectionDefinition = {
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [
        { name: "title", type: "text" },
        { name: "custom", type: "custom-unknown-type" as never },
      ],
    };
    const files = await migrationGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("title TEXT");
    expect(content).toContain("custom TEXT");
  });
});
