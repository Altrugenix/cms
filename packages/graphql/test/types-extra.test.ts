import { describe, it, expect } from "vitest";
import { pascalCase, fieldToGraphQLType, fieldToGraphQLInputType } from "../src/types.js";
import type { CollectionDefinition } from "@arche-cms/types";

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
      fieldToGraphQLType({ name: "status", type: "select", options: [] }, emptyCollections),
    ).toBe("String");
  });

  it("maps radio to String", () => {
    expect(
      fieldToGraphQLType({ name: "choice", type: "radio", options: [] }, emptyCollections),
    ).toBe("String");
  });

  it("maps checkbox to Boolean", () => {
    expect(fieldToGraphQLType({ name: "flag", type: "checkbox" }, emptyCollections)).toBe(
      "Boolean",
    );
  });

  it("maps multiSelect to [String!]", () => {
    expect(
      fieldToGraphQLType({ name: "tags", type: "multiSelect", options: [] }, emptyCollections),
    ).toBe("[String!]");
  });

  it("maps relation to target collection PascalCase", () => {
    const collections: CollectionDefinition[] = [
      {
        slug: "users",
        labels: { singular: "User", plural: "Users" },
        fields: [{ name: "name", type: "text" }],
      },
    ];
    expect(fieldToGraphQLType({ name: "author", type: "relation", to: "users" }, collections)).toBe(
      "Users",
    );
  });

  it("maps relation to String when target not found", () => {
    expect(
      fieldToGraphQLType({ name: "ref", type: "relation", to: "nonexistent" }, emptyCollections),
    ).toBe("String");
  });

  it("maps component to PascalCase of component name", () => {
    expect(
      fieldToGraphQLType(
        { name: "seo", type: "component", component: "seo-widget" },
        emptyCollections,
      ),
    ).toBe("SeoWidget");
  });

  it("maps component without component name to JSON", () => {
    expect(fieldToGraphQLType({ name: "data", type: "component" }, emptyCollections)).toBe("JSON");
  });

  it("maps dynamicZone to [JSON!]", () => {
    expect(
      fieldToGraphQLType({ name: "blocks", type: "dynamicZone", components: [] }, emptyCollections),
    ).toBe("[JSON!]");
  });

  it("maps array to [JSON!]", () => {
    expect(fieldToGraphQLType({ name: "items", type: "array", fields: [] }, emptyCollections)).toBe(
      "[JSON!]",
    );
  });

  it("maps repeater to [JSON!]", () => {
    expect(
      fieldToGraphQLType({ name: "rows", type: "repeater", fields: [] }, emptyCollections),
    ).toBe("[JSON!]");
  });

  it("maps object to JSON", () => {
    expect(fieldToGraphQLType({ name: "meta", type: "object", fields: [] }, emptyCollections)).toBe(
      "JSON",
    );
  });

  it("maps group to JSON", () => {
    expect(
      fieldToGraphQLType({ name: "settings", type: "group", fields: [] }, emptyCollections),
    ).toBe("JSON");
  });

  it("maps tabs to JSON", () => {
    expect(fieldToGraphQLType({ name: "content", type: "tabs", tabs: [] }, emptyCollections)).toBe(
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
      fieldToGraphQLType({ name: "title", type: "text", localized: true }, emptyCollections),
    ).toBe("JSON");
  });
});

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
