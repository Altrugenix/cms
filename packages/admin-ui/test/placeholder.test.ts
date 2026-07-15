import { describe, it, expect } from "vitest";

describe("package index exports (type-only)", () => {
  it("loads index module without error", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });
});
