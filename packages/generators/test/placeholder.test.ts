import { describe, it, expect } from "vitest";

describe("package exports", () => {
  it("imports index module without error", async () => {
    const mod = await import("../src/index.js");
    expect(mod.GenerationPipeline).toBeDefined();
    expect(mod.allGenerators).toBeDefined();
    expect(mod.allGenerators).toHaveLength(8);
  });

  it("imports generator types module", async () => {
    const mod = await import("../src/generator.js");
    // Type-only — verify module loads
    expect(mod).toBeDefined();
  });

  it("imports all generator modules", async () => {
    const modules = await Promise.all([
      import("../src/generator.js"),
      import("../src/typegen.js"),
      import("../src/api-routes.js"),
      import("../src/migrations.js"),
      import("../src/validation.js"),
      import("../src/openapi.js"),
      import("../src/graphql-schema.js"),
      import("../src/admin-forms.js"),
      import("../src/sdk.js"),
      import("../src/hooks.js"),
      import("../src/pipeline.js"),
    ]);
    for (const mod of modules) {
      expect(mod).toBeDefined();
    }
  });
});
