import { describe, it, expect } from "vitest";

import type { Generator, GeneratedFile, GenerationOptions } from "../src/generator.js";

describe("generator interfaces", () => {
  it("GeneratedFile type is usable", () => {
    const file: GeneratedFile = { content: "hello", path: "test.ts" };
    expect(file.path).toBe("test.ts");
    expect(file.content).toBe("hello");
  });

  it("GenerationOptions type is usable", () => {
    const opts: GenerationOptions = { outputDir: "/tmp" };
    expect(opts.outputDir).toBe("/tmp");
    expect(opts.collections).toBeUndefined();
    expect(opts.globals).toBeUndefined();
    expect(opts.components).toBeUndefined();
  });

  it("Generator interface is implementable", async () => {
    const gen: Generator = {
      description: "test generator",
      async generate() {
        return [{ content: "done", path: "out.ts" }];
      },
      name: "test",
    };
    expect(gen.name).toBe("test");
    const files = await gen.generate({ outputDir: "/tmp" });
    expect(files).toHaveLength(1);
  });
});
