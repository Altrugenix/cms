import { rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it, expect, afterEach } from "vitest";

import { collectionCreate } from "../src/commands/collection.js";
import { pluginCreate } from "../src/commands/plugin.js";
import { collectionTemplate, pluginTemplate } from "../src/templates/templates.js";

const testDir = resolve(tmpdir(), `cms-scaffold-test-${Date.now()}`);

afterEach(async () => {
  await rm(testDir, { force: true, recursive: true }).catch(() => {});
});

describe("collectionCreate", () => {
  it("creates a collection file from a slug", async () => {
    await collectionCreate({ dir: resolve(testDir, "collections"), slug: "blog-posts" });

    const content = await readFile(resolve(testDir, "collections", "blog-posts.ts"), "utf-8");
    expect(content).toContain('slug: "blog-posts"');
    expect(content).toContain('labels: { singular: "BlogPosts", plural: "BlogPostss" }');
    expect(content).toContain("defineCollection");
  });

  it("validates that slug is not empty", async () => {
    const exitCodes: number[] = [];
    const origExit = process.exit;
    const origError = console.error;
    process.exit = ((code?: number) => {
      exitCodes.push(code ?? 0);
      throw new Error(`exit ${code}`);
    }) as typeof process.exit;
    console.error = () => {};

    await expect(collectionCreate({ slug: " " })).rejects.toThrow();

    expect(exitCodes).toContain(1);

    process.exit = origExit;
    console.error = origError;
  });
});

describe("pluginCreate", () => {
  it("creates a plugin directory structure", async () => {
    await pluginCreate({ dir: resolve(testDir, "plugins"), slug: "my-plugin" });

    const pkg = JSON.parse(
      await readFile(resolve(testDir, "plugins", "my-plugin", "package.json"), "utf-8"),
    );
    expect(pkg.name).toBe("@arche-cms/plugin-my-plugin");

    const src = await readFile(
      resolve(testDir, "plugins", "my-plugin", "src", "index.ts"),
      "utf-8",
    );
    expect(src).toContain('slug: "my-plugin"');

    const tsconfig = JSON.parse(
      await readFile(resolve(testDir, "plugins", "my-plugin", "tsconfig.json"), "utf-8"),
    );
    expect(tsconfig.compilerOptions.outDir).toBe("dist");
  });
});

describe("collectionTemplate", () => {
  it("produces valid TypeScript output", () => {
    const output = collectionTemplate("test");
    expect(output).toContain('slug: "test"');
    expect(output).toContain('import { defineCollection, text, slug } from "@arche-cms/schema"');
  });

  it("converts kebab-case to PascalCase for labels", () => {
    const output = collectionTemplate("my-collection");
    expect(output).toContain("MyCollection");
  });
});

describe("pluginTemplate", () => {
  it("produces valid plugin structure", () => {
    const result = pluginTemplate("seo");
    const files = Object.keys(result.files);
    expect(files).toContain("package.json");
    expect(files).toContain("src/index.ts");
    expect(files).toContain("tsconfig.json");
  });

  it("includes PluginDefinition export", () => {
    const result = pluginTemplate("seo");
    const src = result.files["src/index.ts"];
    expect(src).toContain("PluginDefinition");
    expect(src).toContain('slug: "seo"');
  });
});
