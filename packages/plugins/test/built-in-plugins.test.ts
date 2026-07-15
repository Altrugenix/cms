import { describe, it, expect } from "vitest";

describe("built-in plugins", () => {
  it("seoPlugin has correct structure", async () => {
    const mod = await import("../src/plugins/seo/index.js");
    const plugin = mod.default;
    expect(plugin.slug).toBe("seo");
    expect(plugin.name).toBe("SEO");
    expect(plugin.fields).toBeDefined();
    expect(plugin.fields["*"]).toHaveLength(6);
    expect(plugin.adminPanels).toHaveLength(1);
    expect(plugin.adminPanels[0].slug).toBe("seo-settings");
  });

  it("auditLogPlugin has correct structure", async () => {
    const mod = await import("../src/plugins/audit-log/index.js");
    const plugin = mod.default;
    expect(plugin.slug).toBe("audit-log");
    expect(plugin.name).toBe("Audit Log");
    expect(plugin.description).toBeDefined();
    expect(plugin.adminPanels).toHaveLength(1);
    expect(plugin.adminPanels[0].slug).toBe("audit-log");
  });

  it("webhooksPlugin has correct structure", async () => {
    const mod = await import("../src/plugins/webhooks/index.js");
    const plugin = mod.default;
    expect(plugin.slug).toBe("webhooks");
    expect(plugin.name).toBe("Webhooks");
    expect(plugin.adminPanels).toHaveLength(1);
    expect(plugin.adminPanels[0].slug).toBe("webhooks");
  });

  it("searchPlugin has correct structure", async () => {
    const mod = await import("../src/plugins/search/index.js");
    const plugin = mod.default;
    expect(plugin.slug).toBe("search");
    expect(plugin.name).toBe("Search");
    expect(plugin.adminPanels).toHaveLength(1);
    expect(plugin.adminPanels[0].slug).toBe("search-settings");
  });

  it("commentsPlugin has correct structure", async () => {
    const mod = await import("../src/plugins/comments/index.js");
    const plugin = mod.default;
    expect(plugin.slug).toBe("comments");
    expect(plugin.name).toBe("Comments");
    expect(plugin.fields).toBeDefined();
    expect(plugin.fields["*"]).toHaveLength(1);
    expect(plugin.adminPanels).toHaveLength(1);
    expect(plugin.adminPanels[0].slug).toBe("comments");
  });

  it("analyticsPlugin has correct structure", async () => {
    const mod = await import("../src/plugins/analytics/index.js");
    const plugin = mod.default;
    expect(plugin.slug).toBe("analytics");
    expect(plugin.name).toBe("Analytics");
    expect(plugin.adminPanels).toHaveLength(1);
    expect(plugin.adminPanels[0].slug).toBe("analytics");
  });
});
