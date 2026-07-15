import { describe, it, expect } from "vitest";
import { generateTypeDefs, generateResolvers } from "../src/index.js";

describe("package index exports", () => {
  it("exports generateTypeDefs", () => {
    expect(generateTypeDefs).toBeDefined();
    expect(typeof generateTypeDefs).toBe("function");
  });

  it("exports generateResolvers", () => {
    expect(generateResolvers).toBeDefined();
    expect(typeof generateResolvers).toBe("function");
  });
});
