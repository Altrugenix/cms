import { describe, it, expect } from "vitest";

import {
  fieldToZodSchema,
  collectionToCreateSchema,
  collectionToUpdateSchema,
  createMutationPayloadSchema,
  updateMutationPayloadSchema,
} from "../src/index.js";

describe("package index exports", () => {
  it("exports fieldToZodSchema", () => {
    expect(fieldToZodSchema).toBeDefined();
    expect(typeof fieldToZodSchema).toBe("function");
  });

  it("exports collectionToCreateSchema", () => {
    expect(collectionToCreateSchema).toBeDefined();
    expect(typeof collectionToCreateSchema).toBe("function");
  });

  it("exports collectionToUpdateSchema", () => {
    expect(collectionToUpdateSchema).toBeDefined();
    expect(typeof collectionToUpdateSchema).toBe("function");
  });

  it("exports createMutationPayloadSchema", () => {
    expect(createMutationPayloadSchema).toBeDefined();
    expect(typeof createMutationPayloadSchema).toBe("function");
  });

  it("exports updateMutationPayloadSchema", () => {
    expect(updateMutationPayloadSchema).toBeDefined();
    expect(typeof updateMutationPayloadSchema).toBe("function");
  });
});
