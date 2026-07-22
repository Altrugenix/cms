import type { CollectionDefinition, GlobalDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import { sdkGenerator } from "../src/sdk.js";
import { generateTypes } from "../src/typegen.js";

describe("sdkGenerator - fieldToType coverage", () => {
  it("maps relation (oneToOne) to string", async () => {
    const col: CollectionDefinition = {
      fields: [{ kind: "oneToOne", name: "author", to: "users", type: "relation" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("author?: string;");
  });

  it("maps relation (oneToMany) to string[]", async () => {
    const col: CollectionDefinition = {
      fields: [{ kind: "oneToMany", name: "posts", to: "posts", type: "relation" }],
      labels: { plural: "Users", singular: "User" },
      slug: "users",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("posts?: string[];");
  });

  it("maps relation (manyToMany) to string[]", async () => {
    const col: CollectionDefinition = {
      fields: [{ kind: "manyToMany", name: "tags", to: "tags", type: "relation" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("tags?: string[];");
  });

  it("maps component (non-repeatable) to Record<string, unknown>", async () => {
    const col: CollectionDefinition = {
      fields: [{ component: "seo", name: "seo", type: "component" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("seo?: Record<string, unknown>;");
  });

  it("maps component (repeatable) to Record<string, unknown>[]", async () => {
    const col: CollectionDefinition = {
      fields: [{ component: "slide", name: "slides", repeatable: true, type: "component" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("slides?: Record<string, unknown>[];");
  });

  it("maps dynamicZone to Record<string, unknown>[]", async () => {
    const col: CollectionDefinition = {
      fields: [{ components: ["hero", "text"], name: "content", type: "dynamicZone" }],
      labels: { plural: "Pages", singular: "Page" },
      slug: "pages",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("content?: Record<string, unknown>[];");
  });

  it("maps array to Array<Record<string, unknown>>", async () => {
    const col: CollectionDefinition = {
      fields: [{ fields: [], name: "items", type: "array" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("items?: Array<Record<string, unknown>>;");
  });

  it("maps object to Record<string, unknown>", async () => {
    const col: CollectionDefinition = {
      fields: [{ fields: [], name: "meta", type: "object" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("meta?: Record<string, unknown>;");
  });

  it("maps group to Record<string, unknown>", async () => {
    const col: CollectionDefinition = {
      fields: [{ fields: [], name: "settings", type: "group" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("settings?: Record<string, unknown>;");
  });

  it("maps repeater to Array<Record<string, unknown>>", async () => {
    const col: CollectionDefinition = {
      fields: [{ fields: [], name: "rows", type: "repeater" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("rows?: Array<Record<string, unknown>>;");
  });

  it("maps tabs to Record<string, unknown>", async () => {
    const col: CollectionDefinition = {
      fields: [{ name: "tabs", tabs: [{ fields: [], label: "Tab1" }], type: "tabs" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("tabs?: Record<string, unknown>;");
  });

  it("maps unknown type to unknown", async () => {
    const col: CollectionDefinition = {
      fields: [{ name: "custom", type: "foobar" as never }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("custom?: unknown;");
  });

  it("wraps localized text field in Record<string, string>", async () => {
    const col: CollectionDefinition = {
      fields: [{ localized: true, name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("title?: Record<string, string>;");
  });
});

describe("sdkGenerator - localized field with non-text types", () => {
  it("wraps localized number field in Record<string, type>", async () => {
    const col: CollectionDefinition = {
      fields: [{ localized: true, name: "count", type: "number" as never }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const files = await sdkGenerator.generate({ collections: [col], outputDir: "/tmp" });
    const content = files[0]?.content ?? "";
    expect(content).toContain("count?: Record<string,");
  });
});

describe("sdkGenerator - with globals provided", () => {
  it("generates interface for globals when globals are provided", async () => {
    const col: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    };
    const global: GlobalDefinition = {
      fields: [{ name: "siteName", type: "text" }],
      label: "Settings",
      slug: "settings",
    };
    const files = await sdkGenerator.generate({
      collections: [col],
      globals: [global],
      outputDir: "/tmp",
    });
    const content = files[0]?.content ?? "";
    expect(content).toContain("SettingsGlobals");
    expect(content).toContain("siteName");
  });
});

describe("generateTypes - timestamps disabled", () => {
  it("omits createdAt and updatedAt when timestamps is false", () => {
    const output = generateTypes({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
          timestamps: false,
        },
      ],
      outputPath: "/tmp/types.ts",
    });
    expect(output).toContain("interface Posts {");
    expect(output).not.toMatch(/createdAt/);
    expect(output).not.toMatch(/updatedAt/);
  });

  it("includes only updatedAt when createdAt is false", () => {
    const output = generateTypes({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
          timestamps: { createdAt: false, updatedAt: true },
        },
      ],
      outputPath: "/tmp/types.ts",
    });
    expect(output).not.toMatch(/createdAt/);
    expect(output).toContain("updatedAt?: string;");
  });

  it("includes both timestamps by default", () => {
    const output = generateTypes({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          labels: { plural: "Posts", singular: "Post" },
          slug: "posts",
        },
      ],
      outputPath: "/tmp/types.ts",
    });
    expect(output).toContain("createdAt?: string;");
    expect(output).toContain("updatedAt?: string;");
  });
});
