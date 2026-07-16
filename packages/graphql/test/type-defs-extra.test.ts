import { describe, it, expect } from "vitest";
import type { CollectionDefinition } from "@arche-cms/types";
import { generateTypeDefs } from "../src/type-defs.js";

const localizedCollection: CollectionDefinition = {
  slug: "localized-posts",
  labels: { singular: "Localized Post", plural: "Localized Posts" },
  fields: [{ name: "title", type: "text" }],
  localization: {
    locales: ["en", "fr"],
    defaultLocale: "en",
  },
};

const collectionWithLabel: CollectionDefinition = {
  slug: "labeled",
  labels: { singular: "Labeled", plural: "Labeled" },
  fields: [{ name: "title", type: "text", label: "Title Field" }],
};

const emptyFieldsCollection: CollectionDefinition = {
  slug: "empty",
  labels: { singular: "Empty", plural: "Empty" },
  fields: [],
};

describe("type-defs branch coverage", () => {
  it("includes locale arg for localized collections", () => {
    const sdl = generateTypeDefs([localizedCollection]);
    expect(sdl).toContain("locale: String");
    expect(sdl).toContain("listLocalizedPosts(");
    expect(sdl).toContain("localized-posts(id: ID!");
  });

  it("does not include locale arg for non-localized collections", () => {
    const collection: CollectionDefinition = {
      slug: "simple",
      labels: { singular: "Simple", plural: "Simples" },
      fields: [{ name: "name", type: "text" }],
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).not.toContain("locale: String");
  });

  it("includes field label as description", () => {
    const sdl = generateTypeDefs([collectionWithLabel]);
    expect(sdl).toContain('"Title Field"');
  });

  it("generates filter/sort/create/update types for fieldless collections", () => {
    const sdl = generateTypeDefs([emptyFieldsCollection]);
    expect(sdl).toContain("input EmptyFilter");
    expect(sdl).toContain("enum EmptySort");
    expect(sdl).toContain("input EmptyCreateInput");
    expect(sdl).toContain("input EmptyUpdateInput");
  });

  it("generates filter input for checkbox type as Boolean", () => {
    const collection: CollectionDefinition = {
      slug: "checks",
      labels: { singular: "Checks", plural: "Checks" },
      fields: [{ name: "active", type: "checkbox" }],
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("active: Boolean");
  });

  it("generates filter input for date type as String", () => {
    const collection: CollectionDefinition = {
      slug: "events",
      labels: { singular: "Events", plural: "Events" },
      fields: [
        { name: "start", type: "date" },
        { name: "end", type: "datetime" },
      ],
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("start: String");
    expect(sdl).toContain("end: String");
  });

  it("generates filter input for select/radio/multiSelect as String", () => {
    const collection: CollectionDefinition = {
      slug: "forms",
      labels: { singular: "Forms", plural: "Forms" },
      fields: [
        { name: "color", type: "select", options: [] },
        { name: "choice", type: "radio", options: [] },
        { name: "tags", type: "multiSelect", options: [] },
      ],
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("color: String");
    expect(sdl).toContain("choice: String");
    expect(sdl).toContain("tags: String");
  });

  it("generates filter for number type as Float", () => {
    const collection: CollectionDefinition = {
      slug: "metrics",
      labels: { singular: "Metrics", plural: "Metrics" },
      fields: [{ name: "count", type: "number" }],
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("count: Float");
  });
});
