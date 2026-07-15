import { describe, it, expect } from "vitest";
import type { Generator, GeneratedFile, GenerationOptions } from "../src/generator.js";

describe("generator interfaces", () => {
  it("GeneratedFile type is usable", () => {
    const file: GeneratedFile = { path: "test.ts", content: "hello" };
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
      name: "test",
      description: "test generator",
      async generate() {
        return [{ path: "out.ts", content: "done" }];
      },
    };
    expect(gen.name).toBe("test");
    const files = await gen.generate({ outputDir: "/tmp" });
    expect(files).toHaveLength(1);
  });
});
