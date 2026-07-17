import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import { generateTypeDefs } from "../src/type-defs.js";

const localizedCollection: CollectionDefinition = {
  fields: [{ name: "title", type: "text" }],
  labels: { plural: "Localized Posts", singular: "Localized Post" },
  localization: {
    defaultLocale: "en",
    locales: ["en", "fr"],
  },
  slug: "localized-posts",
};

const collectionWithLabel: CollectionDefinition = {
  fields: [{ label: "Title Field", name: "title", type: "text" }],
  labels: { plural: "Labeled", singular: "Labeled" },
  slug: "labeled",
};

const emptyFieldsCollection: CollectionDefinition = {
  fields: [],
  labels: { plural: "Empty", singular: "Empty" },
  slug: "empty",
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
      fields: [{ name: "name", type: "text" }],
      labels: { plural: "Simples", singular: "Simple" },
      slug: "simple",
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
      fields: [{ name: "active", type: "checkbox" }],
      labels: { plural: "Checks", singular: "Checks" },
      slug: "checks",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("active: Boolean");
  });

  it("generates filter input for date type as String", () => {
    const collection: CollectionDefinition = {
      fields: [
        { name: "start", type: "date" },
        { name: "end", type: "datetime" },
      ],
      labels: { plural: "Events", singular: "Events" },
      slug: "events",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("start: String");
    expect(sdl).toContain("end: String");
  });

  it("generates filter input for select/radio/multiSelect as String", () => {
    const collection: CollectionDefinition = {
      fields: [
        { name: "color", options: [], type: "select" },
        { name: "choice", options: [], type: "radio" },
        { name: "tags", options: [], type: "multiSelect" },
      ],
      labels: { plural: "Forms", singular: "Forms" },
      slug: "forms",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("color: String");
    expect(sdl).toContain("choice: String");
    expect(sdl).toContain("tags: String");
  });

  it("generates filter for number type as Float", () => {
    const collection: CollectionDefinition = {
      fields: [{ name: "count", type: "number" }],
      labels: { plural: "Metrics", singular: "Metrics" },
      slug: "metrics",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("count: Float");
  });
});
