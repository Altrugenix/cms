import { describe, it, expect } from "vitest";

import { AccessControl } from "../src/index.js";

describe("package index exports", () => {
  it("exports AccessControl", () => {
    expect(AccessControl).toBeDefined();
    expect(typeof AccessControl).toBe("function");
  });
});
