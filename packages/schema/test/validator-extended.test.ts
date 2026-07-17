import { describe, it, expect } from "vitest";

import { validateCollection } from "../src/validator.js";

describe("validateCollection - extended coverage", () => {
  it("rejects collection with empty slug", () => {
    const result = validateCollection({
      fields: [{ name: "title", type: "text" }],
      labels: { plural: "Posts", singular: "Post" },
      slug: "",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path === "slug" && i.message.includes("required"))).toBe(
      true,
    );
  });

  it("rejects collection with missing labels", () => {
    const result = validateCollection({
      fields: [{ name: "title", type: "text" }],
      labels: undefined as unknown as { singular: string; plural: string },
      slug: "test",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path === "labels")).toBe(true);
  });

  it("warns on missing fields array", () => {
    const result = validateCollection({
      fields: undefined as unknown as [],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.path === "fields" && i.severity === "warning")).toBe(true);
  });

  it("rejects multiSelect field without options", () => {
    const result = validateCollection({
      fields: [{ name: "tags", type: "multiSelect" }],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("options"))).toBe(true);
  });

  it("rejects radio field without options", () => {
    const result = validateCollection({
      fields: [{ name: "choice", type: "radio" }],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("options"))).toBe(true);
  });

  it("rejects component field without component slug", () => {
    const result = validateCollection({
      fields: [{ name: "seo", type: "component" }],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("component"))).toBe(true);
  });

  it("rejects dynamicZone field without components", () => {
    const result = validateCollection({
      fields: [{ name: "blocks", type: "dynamicZone" }],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("components"))).toBe(true);
  });

  it("rejects dynamicZone field with empty components array", () => {
    const result = validateCollection({
      fields: [{ components: [], name: "blocks", type: "dynamicZone" }],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("components"))).toBe(true);
  });

  it("rejects field with empty name", () => {
    const result = validateCollection({
      fields: [{ name: "  ", type: "text" }],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("Field name is required"))).toBe(true);
  });

  it("skips null/undefined entries in fields array", () => {
    const result = validateCollection({
      fields: [
        undefined as unknown as { name: string; type: string },
        { name: "title", type: "text" },
      ],
      labels: { plural: "Tests", singular: "Test" },
      slug: "test",
    });
    expect(result.valid).toBe(true);
  });

  it("validates a fully valid collection with all field types", () => {
    const result = validateCollection({
      fields: [
        { name: "title", type: "text" },
        { name: "status", options: [{ label: "Draft", value: "draft" }], type: "select" },
        { name: "author", to: "users", type: "relation" },
        { component: "seo", name: "seo", type: "component" },
        { components: ["hero", "cta"], name: "blocks", type: "dynamicZone" },
      ],
      labels: { plural: "Completes", singular: "Complete" },
      slug: "complete",
    });
    expect(result.valid).toBe(true);
  });
});
