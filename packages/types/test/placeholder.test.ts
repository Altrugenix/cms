import { describe, it, expect } from "vitest";

describe("package index exports", () => {
  it("loads index module without error", async () => {
    const mod = await import("../src/index.js");
    expect(mod).toBeDefined();
  });

  it("exports PKG_NAME", async () => {
    const mod = await import("../src/index.js");
    expect(mod.PKG_NAME).toBe("@arche-cms/types");
  });
});
