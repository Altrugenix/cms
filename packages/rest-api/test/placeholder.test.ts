import { describe, it, expect } from "vitest";

describe("package exports", () => {
  it("exports all public API functions", async () => {
    const mod = await import("../src/index.js");
    expect(mod.createCollectionRouter).toBeDefined();
    expect(mod.createCollectionRouters).toBeDefined();
    expect(mod.createListHandler).toBeDefined();
    expect(mod.createGetHandler).toBeDefined();
    expect(mod.createCreateHandler).toBeDefined();
    expect(mod.createUpdateHandler).toBeDefined();
    expect(mod.createDeleteHandler).toBeDefined();
    expect(mod.generateOpenApiSpec).toBeDefined();
    expect(mod.registerRoutes).toBeDefined();
  });
});

describe("types module", () => {
  it("loads types module without error", async () => {
    const mod = await import("../src/types.js");
    expect(mod).toBeDefined();
  });
});
