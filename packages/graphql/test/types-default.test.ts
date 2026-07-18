import type { CollectionDefinition } from "@arche-cms/types";

import { describe, it, expect } from "vitest";

import { fieldToGraphQLType } from "../src/types.js";

const emptyCollections: CollectionDefinition[] = [];

describe("types.ts default branch coverage", () => {
  it("handles unknown field type via default case", () => {
    const result = fieldToGraphQLType(
      { name: "custom", type: "unknown" as never },
      emptyCollections,
    );
    expect(result).toBe("String");
  });
});
