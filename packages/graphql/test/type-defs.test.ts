import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import { generateTypeDefs } from "../src/type-defs.js";

const postCollection: CollectionDefinition = {
  fields: [
    { name: "title", type: "text", validation: { required: true } },
    { name: "body", type: "richText" },
    { name: "author", to: "users", type: "relation" },
    {
      name: "status",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      type: "select",
    },
    { name: "views", type: "number" },
    { name: "published", type: "boolean" },
    { name: "tags", options: [{ label: "News", value: "news" }], type: "multiSelect" },
  ],
  labels: { plural: "Posts", singular: "Post" },
  slug: "posts",
};

const userCollection: CollectionDefinition = {
  fields: [
    { name: "email", type: "email", validation: { required: true } },
    { name: "name", type: "text" },
  ],
  labels: { plural: "Users", singular: "User" },
  slug: "users",
};

describe("generateTypeDefs", () => {
  it("generates JSON scalar", () => {
    const sdl = generateTypeDefs([postCollection]);
    expect(sdl).toContain("scalar JSON");
  });

  it("generates object type for each collection", () => {
    const sdl = generateTypeDefs([postCollection, userCollection]);
    expect(sdl).toContain("type Posts");
    expect(sdl).toContain("type Users");
  });

  it("includes id field in object types", () => {
    const sdl = generateTypeDefs([postCollection]);
    expect(sdl).toContain("id: ID!");
  });

  it("maps field types to GraphQL types", () => {
    const sdl = generateTypeDefs([postCollection]);
    expect(sdl).toContain("title: String!");
    expect(sdl).toContain("body: String");
    expect(sdl).toContain("views: Float");
    expect(sdl).toContain("published: Boolean");
  });

  it("handles required fields with !", () => {
    const sdl = generateTypeDefs([postCollection]);
    expect(sdl).toContain("title: String!");
    expect(sdl).not.toContain("body: String!");
  });

  it("generates filter input type", () => {
    const sdl = generateTypeDefs([postCollection]);
    expect(sdl).toContain("input PostsFilter");
    expect(sdl).toContain("title: String");
    expect(sdl).toContain("views: Float");
  });

  it("generates sort enum", () => {
    const sdl = generateTypeDefs([postCollection]);
    expect(sdl).toContain("enum PostsSort");
    expect(sdl).toContain("title_asc");
    expect(sdl).toContain("title_desc");
  });

  it("generates create/update input types", () => {
    const sdl = generateTypeDefs([postCollection]);
    expect(sdl).toContain("input PostsCreateInput");
    expect(sdl).toContain("input PostsUpdateInput");
  });

  it("generates Query type with list and single queries", () => {
    const sdl = generateTypeDefs([postCollection, userCollection]);
    expect(sdl).toContain("type Query");
    expect(sdl).toContain("listPosts");
    expect(sdl).toContain("listUsers");
    expect(sdl).toContain("posts(id: ID!): Posts");
    expect(sdl).toContain("users(id: ID!): Users");
  });

  it("generates Mutation type with CRUD", () => {
    const sdl = generateTypeDefs([postCollection]);
    expect(sdl).toContain("type Mutation");
    expect(sdl).toContain("createPosts");
    expect(sdl).toContain("updatePosts");
    expect(sdl).toContain("deletePosts");
  });

  it("generates timestamps fields", () => {
    const sdl = generateTypeDefs([postCollection]);
    expect(sdl).toContain("createdAt: String");
    expect(sdl).toContain("updatedAt: String");
  });

  it("handles hyphens in collection slug", () => {
    const collection: CollectionDefinition = {
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Blog Posts", singular: "Blog Post" },
      slug: "blog-posts",
    };
    const sdl = generateTypeDefs([collection]);
    expect(sdl).toContain("type BlogPosts");
    expect(sdl).toContain("listBlogPosts");
  });
});
