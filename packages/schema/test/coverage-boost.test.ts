import { describe, it, expect } from "vitest";

import { defineCollection } from "../src/define-collection.js";

describe("defineCollection", () => {
  it("returns false for timestamps when explicitly set to false", () => {
    const result = defineCollection({
      fields: [],
      labels: { plural: "Items", singular: "Item" },
      slug: "items",
      timestamps: false,
    });
    expect(result.timestamps).toBe(false);
  });

  it("returns default timestamps when timestamps is omitted", () => {
    const result = defineCollection({
      fields: [],
      labels: { plural: "Items", singular: "Item" },
      slug: "items",
    });
    expect(result.timestamps).toEqual({ createdAt: true, updatedAt: true });
  });

  it("merges custom timestamps with defaults", () => {
    const result = defineCollection({
      fields: [],
      labels: { plural: "Items", singular: "Item" },
      slug: "items",
      timestamps: { createdAt: false },
    });
    expect(result.timestamps).toEqual({ createdAt: false, updatedAt: true });
  });

  it("preserves all other config properties", () => {
    const result = defineCollection({
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "posts",
    });
    expect(result.slug).toBe("posts");
    expect(result.fields).toHaveLength(1);
    expect(result.labels).toEqual({ plural: "Posts", singular: "Post" });
  });
});
