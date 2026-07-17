import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import { pascalCase, fieldToGraphQLType, fieldToGraphQLInputType } from "../src/types.js";

const emptyCollections: CollectionDefinition[] = [];

describe("pascalCase", () => {
  it("converts hyphenated slug", () => {
    expect(pascalCase("blog-posts")).toBe("BlogPosts");
  });

  it("converts underscored slug", () => {
    expect(pascalCase("blog_posts")).toBe("BlogPosts");
  });

  it("converts single word", () => {
    expect(pascalCase("posts")).toBe("Posts");
  });

  it("handles mixed separators", () => {
    expect(pascalCase("my_cool-posts")).toBe("MyCoolPosts");
  });
});

describe("fieldToGraphQLType", () => {
  it("maps media to String", () => {
    expect(fieldToGraphQLType({ name: "img", type: "media" }, emptyCollections)).toBe("String");
  });

  it("maps upload to String", () => {
    expect(fieldToGraphQLType({ name: "file", type: "upload" }, emptyCollections)).toBe("String");
  });

  it("maps select to String", () => {
    expect(
      fieldToGraphQLType({ name: "status", options: [], type: "select" }, emptyCollections),
    ).toBe("String");
  });

  it("maps radio to String", () => {
    expect(
      fieldToGraphQLType({ name: "choice", options: [], type: "radio" }, emptyCollections),
    ).toBe("String");
  });

  it("maps checkbox to Boolean", () => {
    expect(fieldToGraphQLType({ name: "flag", type: "checkbox" }, emptyCollections)).toBe(
      "Boolean",
    );
  });

  it("maps multiSelect to [String!]", () => {
    expect(
      fieldToGraphQLType({ name: "tags", options: [], type: "multiSelect" }, emptyCollections),
    ).toBe("[String!]");
  });

  it("maps relation to target collection PascalCase", () => {
    const collections: CollectionDefinition[] = [
      {
        fields: [{ name: "name", type: "text" }],
        labels: { plural: "Users", singular: "User" },
        slug: "users",
      },
    ];
    expect(fieldToGraphQLType({ name: "author", to: "users", type: "relation" }, collections)).toBe(
      "Users",
    );
  });

  it("maps relation to String when target not found", () => {
    expect(
      fieldToGraphQLType({ name: "ref", to: "nonexistent", type: "relation" }, emptyCollections),
    ).toBe("String");
  });

  it("maps component to PascalCase of component name", () => {
    expect(
      fieldToGraphQLType(
        { component: "seo-widget", name: "seo", type: "component" },
        emptyCollections,
      ),
    ).toBe("SeoWidget");
  });

  it("maps component without component name to JSON", () => {
    expect(fieldToGraphQLType({ name: "data", type: "component" }, emptyCollections)).toBe("JSON");
  });

  it("maps dynamicZone to [JSON!]", () => {
    expect(
      fieldToGraphQLType({ components: [], name: "blocks", type: "dynamicZone" }, emptyCollections),
    ).toBe("[JSON!]");
  });

  it("maps array to [JSON!]", () => {
    expect(fieldToGraphQLType({ fields: [], name: "items", type: "array" }, emptyCollections)).toBe(
      "[JSON!]",
    );
  });

  it("maps repeater to [JSON!]", () => {
    expect(
      fieldToGraphQLType({ fields: [], name: "rows", type: "repeater" }, emptyCollections),
    ).toBe("[JSON!]");
  });

  it("maps object to JSON", () => {
    expect(fieldToGraphQLType({ fields: [], name: "meta", type: "object" }, emptyCollections)).toBe(
      "JSON",
    );
  });

  it("maps group to JSON", () => {
    expect(
      fieldToGraphQLType({ fields: [], name: "settings", type: "group" }, emptyCollections),
    ).toBe("JSON");
  });

  it("maps tabs to JSON", () => {
    expect(fieldToGraphQLType({ name: "content", tabs: [], type: "tabs" }, emptyCollections)).toBe(
      "JSON",
    );
  });

  it("maps unknown type to String (default)", () => {
    expect(fieldToGraphQLType({ name: "x", type: "text" as never }, emptyCollections)).toBe(
      "String",
    );
  });

  it("returns JSON for localized field", () => {
    expect(
      fieldToGraphQLType({ localized: true, name: "title", type: "text" }, emptyCollections),
    ).toBe("JSON");
  });
});

// eslint-disable-next-line no-secrets/no-secrets -- false positive on function name
describe("fieldToGraphQLInputType", () => {
  it("adds ! for required field", () => {
    expect(
      fieldToGraphQLInputType(
        { name: "title", type: "text", validation: { required: true } },
        emptyCollections,
      ),
    ).toBe("String!");
  });

  it("no ! for optional field", () => {
    expect(fieldToGraphQLInputType({ name: "body", type: "text" }, emptyCollections)).toBe(
      "String",
    );
  });
});
