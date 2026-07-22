import type { FieldDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import { fieldToZodSchema } from "../src/generator.js";

describe("fieldToZodSchema — select/radio options branches", () => {
  it("select with string options produces enum", () => {
    const field = {
      name: "status",
      options: ["a", "b"],
      type: "select",
    } as unknown as FieldDefinition;
    const schema = fieldToZodSchema(field);
    expect(schema.parse("a")).toBe("a");
    expect(schema.parse("b")).toBe("b");
    expect(() => schema.parse("c")).toThrow();
  });

  it("select with empty options produces z.string()", () => {
    const field = { name: "status", options: [], type: "select" } as unknown as FieldDefinition;
    const schema = fieldToZodSchema(field);
    expect(schema.parse("anything")).toBe("anything");
    expect(schema.parse("also-anything")).toBe("also-anything");
  });

  it("select with no options property produces z.string()", () => {
    const field = { name: "status", type: "select" } as unknown as FieldDefinition;
    const schema = fieldToZodSchema(field);
    expect(schema.parse("自由")).toBe("自由");
    expect(schema.parse("123")).toBe("123");
  });

  it("radio with string options produces enum", () => {
    const field = {
      name: "choice",
      options: ["yes", "no"],
      type: "radio",
    } as unknown as FieldDefinition;
    const schema = fieldToZodSchema(field);
    expect(schema.parse("yes")).toBe("yes");
    expect(() => schema.parse("maybe")).toThrow();
  });

  it("radio with no options produces z.string()", () => {
    const field = { name: "choice", type: "radio" } as unknown as FieldDefinition;
    const schema = fieldToZodSchema(field);
    expect(schema.parse("anything")).toBe("anything");
  });

  it("radio with empty options produces z.string()", () => {
    const field = { name: "choice", options: [], type: "radio" } as unknown as FieldDefinition;
    const schema = fieldToZodSchema(field);
    expect(schema.parse("anything")).toBe("anything");
  });

  it("select with object options produces enum from values", () => {
    const field: FieldDefinition = {
      name: "status",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      type: "select",
    };
    const schema = fieldToZodSchema(field);
    expect(schema.parse("active")).toBe("active");
    expect(schema.parse("inactive")).toBe("inactive");
    expect(() => schema.parse("deleted")).toThrow();
  });
});
