import { describe, it, expect } from "vitest";

describe("package exports", () => {
  it("exports PluginManager class", async () => {
    const mod = await import("../src/index.js");
    expect(mod.PluginManager).toBeDefined();
    expect(typeof mod.PluginManager).toBe("function");
  });

  it("exports discoverPlugins function", async () => {
    const mod = await import("../src/index.js");
    expect(mod.discoverPlugins).toBeDefined();
    expect(typeof mod.discoverPlugins).toBe("function");
  });

  it("exports all built-in plugins", async () => {
    const mod = await import("../src/index.js");
    expect(mod.seoPlugin).toBeDefined();
    expect(mod.auditLogPlugin).toBeDefined();
    expect(mod.webhooksPlugin).toBeDefined();
    expect(mod.searchPlugin).toBeDefined();
    expect(mod.commentsPlugin).toBeDefined();
    expect(mod.analyticsPlugin).toBeDefined();
  });
});
