import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SchemaLoader } from "../src/loader.js";

const testDir = resolve(tmpdir(), `cms-loader-test-${Date.now()}`);

beforeEach(async () => {
  await rm(testDir, { force: true, recursive: true });
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { force: true, recursive: true });
});

async function writeSchema(dir: string, filename: string, content: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, filename), content, "utf-8");
}

describe("SchemaLoader", () => {
  it("loads collections from collections directory", async () => {
    await writeSchema(
      resolve(testDir, "collections"),
      "posts.ts",
      `export default { slug: "posts", fields: [{ name: "title" }] }`,
    );

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.collections.has("posts")).toBe(true);
    expect(result.collections.size).toBe(1);
  });

  it("loads globals from globals directory", async () => {
    await writeSchema(
      resolve(testDir, "globals"),
      "settings.ts",
      `export default { slug: "settings", fields: [{ name: "siteName" }] }`,
    );

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.globals.has("settings")).toBe(true);
    expect(result.globals.size).toBe(1);
  });

  it("loads components from components directory", async () => {
    await writeSchema(
      resolve(testDir, "components"),
      "seo.ts",
      `export default { slug: "seo", fields: [{ name: "title" }] }`,
    );

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.components.has("seo")).toBe(true);
    expect(result.components.size).toBe(1);
  });

  it("loads all three categories in parallel", async () => {
    await writeSchema(
      resolve(testDir, "collections"),
      "posts.ts",
      `export default { slug: "posts", fields: [{ name: "title" }] }`,
    );
    await writeSchema(
      resolve(testDir, "globals"),
      "settings.ts",
      `export default { slug: "settings", fields: [{ name: "siteName" }] }`,
    );
    await writeSchema(
      resolve(testDir, "components"),
      "seo.ts",
      `export default { slug: "seo", fields: [{ name: "title" }] }`,
    );

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.collections.size).toBe(1);
    expect(result.globals.size).toBe(1);
    expect(result.components.size).toBe(1);
  });

  it("calls onBeforeLoad hook", async () => {
    let called = false;
    const loader = new SchemaLoader({
      baseDir: testDir,
      onBeforeLoad: async () => {
        called = true;
      },
    });
    await loader.load();
    expect(called).toBe(true);
  });

  it("calls onAfterLoad hook with schema result", async () => {
    let receivedResult: unknown = null;
    await writeSchema(
      resolve(testDir, "collections"),
      "posts.ts",
      `export default { slug: "posts", fields: [{ name: "title" }] }`,
    );

    const loader = new SchemaLoader({
      baseDir: testDir,
      onAfterLoad: async (schema) => {
        receivedResult = schema;
      },
    });
    await loader.load();

    expect(receivedResult).toBeDefined();
    const r = receivedResult as {
      collections: Map<string, unknown>;
      globals: Map<string, unknown>;
      components: Map<string, unknown>;
    };
    expect(r.collections.has("posts")).toBe(true);
  });

  it("skips non-ts non-js files", async () => {
    await writeSchema(resolve(testDir, "collections"), "notes.txt", `this is not a schema`);

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.collections.size).toBe(0);
  });

  it("skips files that do not export valid definitions", async () => {
    await writeSchema(
      resolve(testDir, "collections"),
      "bad.ts",
      `export default "not a valid definition"`,
    );

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.collections.size).toBe(0);
  });

  it("handles non-existent directories gracefully", async () => {
    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.collections.size).toBe(0);
    expect(result.globals.size).toBe(0);
    expect(result.components.size).toBe(0);
  });

  it("loads multiple files from same directory", async () => {
    await writeSchema(
      resolve(testDir, "collections"),
      "posts.ts",
      `export default { slug: "posts", fields: [{ name: "title" }] }`,
    );
    await writeSchema(
      resolve(testDir, "collections"),
      "comments.ts",
      `export default { slug: "comments", fields: [{ name: "body" }] }`,
    );

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.collections.size).toBe(2);
    expect(result.collections.has("posts")).toBe(true);
    expect(result.collections.has("comments")).toBe(true);
  });

  it("loads .js files as well as .ts files", async () => {
    await writeSchema(
      resolve(testDir, "collections"),
      "pages.js",
      `export default { slug: "pages", fields: [{ name: "title" }] }`,
    );

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.collections.has("pages")).toBe(true);
  });

  it("handles module exports as named export (mod.default undefined)", async () => {
    await writeSchema(
      resolve(testDir, "globals"),
      "config.ts",
      `const def = { slug: "config", fields: [{ name: "key" }] }; export default def;`,
    );

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.globals.has("config")).toBe(true);
  });

  it("loads module with named exports (no default)", async () => {
    await writeSchema(
      resolve(testDir, "components"),
      "button.ts",
      `export const slug = "button"; export const fields = [{ name: "label" }];`,
    );

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.components.has("button")).toBe(true);
    expect(result.components.size).toBe(1);
  });

  it("logs non-ENOENT errors during file import", async () => {
    await writeSchema(
      resolve(testDir, "collections"),
      "broken.ts",
      `throw new Error("bad module")`,
    );

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const loader = new SchemaLoader({ baseDir: testDir });
    const result = await loader.load();

    expect(result.collections.size).toBe(0);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain("[SchemaLoader] Error loading collections");

    spy.mockRestore();
  });
});
