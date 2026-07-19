import type { CollectionDefinition, GlobalDefinition } from "@arche-cms/types";

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

describe("type-defs — component refs collection", () => {
  it("generates placeholder component type for direct component field", () => {
    const collection: CollectionDefinition = {
      fields: [
        { name: "title", type: "text" },
        { component: "seo-widget", name: "seo", type: "component" },
      ],
      labels: { plural: "Pages", singular: "Page" },
      slug: "pages",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("type SeoWidget {");
    expect(sdl).toContain("_: Boolean");
  });

  it("generates placeholder component type for component nested inside array", () => {
    const collection: CollectionDefinition = {
      fields: [
        {
          fields: [{ component: "hero-block", name: "hero", type: "component" }],
          name: "blocks",
          type: "array",
        },
      ],
      labels: { plural: "Pages", singular: "Page" },
      slug: "pages",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("type HeroBlock {");
    expect(sdl).toContain("_: Boolean");
  });

  it("generates placeholder component type for component nested inside object", () => {
    const collection: CollectionDefinition = {
      fields: [
        {
          fields: [{ component: "meta-info", name: "meta", type: "component" }],
          name: "settings",
          type: "object",
        },
      ],
      labels: { plural: "Pages", singular: "Page" },
      slug: "pages",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("type MetaInfo {");
  });

  it("generates placeholder component type for component nested inside group", () => {
    const collection: CollectionDefinition = {
      fields: [
        {
          fields: [{ component: "address-fields", name: "address", type: "component" }],
          name: "profile",
          type: "group",
        },
      ],
      labels: { plural: "Users", singular: "User" },
      slug: "users",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("type AddressFields {");
  });

  it("generates placeholder component type for component nested inside repeater", () => {
    const collection: CollectionDefinition = {
      fields: [
        {
          fields: [{ component: "slide-item", name: "slide", type: "component" }],
          name: "slides",
          type: "repeater",
        },
      ],
      labels: { plural: "Carousels", singular: "Carousel" },
      slug: "carousels",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("type SlideItem {");
  });

  it("generates placeholder component type for component inside tabs", () => {
    const collection: CollectionDefinition = {
      fields: [
        {
          name: "content",
          tabs: [
            {
              fields: [{ component: "seo-widget", name: "seo", type: "component" }],
              label: "SEO",
            },
          ],
          type: "tabs",
        },
      ],
      labels: { plural: "Pages", singular: "Page" },
      slug: "pages",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("type SeoWidget {");
    expect(sdl).toContain("_: Boolean");
  });

  it("does not duplicate component types for same slug", () => {
    const collection: CollectionDefinition = {
      fields: [
        { component: "seo-widget", name: "seo1", type: "component" },
        { component: "seo-widget", name: "seo2", type: "component" },
      ],
      labels: { plural: "Pages", singular: "Page" },
      slug: "pages",
    };
    const sdl = generateTypeDefs([collection]);
    const matches = sdl.match(/type SeoWidget \{/g);
    expect(matches).toHaveLength(1);
  });
});

describe("type-defs — globals edge cases", () => {
  it("generates _: Boolean and _: String for empty globals array with no fields", () => {
    const emptyGlobal: GlobalDefinition = {
      fields: [],
      label: "Empty",
      slug: "empty",
    };
    const sdl = generateTypeDefs([], [emptyGlobal]);
    expect(sdl).toContain("type Empty {");
    expect(sdl).toContain("_: Boolean");
    expect(sdl).toContain("input EmptyInput {");
    expect(sdl).toContain("_: String");
  });

  it("generates _: Boolean for global with no fields in type", () => {
    const global: GlobalDefinition = {
      fields: [],
      label: "Navigation",
      slug: "navigation",
    };
    const sdl = generateTypeDefs([], [global]);
    expect(sdl).toContain("type Navigation {");
    expect(sdl).toContain("_: Boolean");
  });

  it("generates global query and mutation fields", () => {
    const global: GlobalDefinition = {
      fields: [{ name: "logo", type: "text" }],
      label: "Brand",
      slug: "brand",
    };
    const sdl = generateTypeDefs([], [global]);
    expect(sdl).toContain("brand: Brand");
    expect(sdl).toContain("updateBrand(data: BrandInput!): Brand!");
  });
});
