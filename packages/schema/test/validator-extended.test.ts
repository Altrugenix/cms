import { describe, it, expect } from "vitest";
import { validateCollection } from "../src/validator.js";

describe("validateCollection - extended coverage", () => {
  it("rejects collection with empty slug", () => {
    const result = validateCollection({
      slug: "",
      labels: { singular: "Post", plural: "Posts" },
      fields: [{ name: "title", type: "text" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path === "slug" && i.message.includes("required"))).toBe(
      true,
    );
  });

  it("rejects collection with missing labels", () => {
    const result = validateCollection({
      slug: "test",
      labels: undefined as unknown as { singular: string; plural: string },
      fields: [{ name: "title", type: "text" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path === "labels")).toBe(true);
  });

  it("warns on missing fields array", () => {
    const result = validateCollection({
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: undefined as unknown as [],
    });
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.path === "fields" && i.severity === "warning")).toBe(true);
  });

  it("rejects multiSelect field without options", () => {
    const result = validateCollection({
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "tags", type: "multiSelect" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("options"))).toBe(true);
  });

  it("rejects radio field without options", () => {
    const result = validateCollection({
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "choice", type: "radio" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("options"))).toBe(true);
  });

  it("rejects component field without component slug", () => {
    const result = validateCollection({
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "seo", type: "component" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("component"))).toBe(true);
  });

  it("rejects dynamicZone field without components", () => {
    const result = validateCollection({
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "blocks", type: "dynamicZone" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("components"))).toBe(true);
  });

  it("rejects dynamicZone field with empty components array", () => {
    const result = validateCollection({
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "blocks", type: "dynamicZone", components: [] }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes("components"))).toBe(true);
  });

  it("rejects field with empty name", () => {
    const result = validateCollection({
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [{ name: "  ", type: "text" }],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("Field name is required"))).toBe(true);
  });

  it("skips null/undefined entries in fields array", () => {
    const result = validateCollection({
      slug: "test",
      labels: { singular: "Test", plural: "Tests" },
      fields: [
        undefined as unknown as { name: string; type: string },
        { name: "title", type: "text" },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("validates a fully valid collection with all field types", () => {
    const result = validateCollection({
      slug: "complete",
      labels: { singular: "Complete", plural: "Completes" },
      fields: [
        { name: "title", type: "text" },
        { name: "status", type: "select", options: [{ label: "Draft", value: "draft" }] },
        { name: "author", type: "relation", to: "users" },
        { name: "seo", type: "component", component: "seo" },
        { name: "blocks", type: "dynamicZone", components: ["hero", "cta"] },
      ],
    });
    expect(result.valid).toBe(true);
  });
});
