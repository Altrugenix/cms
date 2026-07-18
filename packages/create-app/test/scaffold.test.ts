/* eslint-disable no-secrets/no-secrets */
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

async function scaffold(
  projectDir: string,
  opts: { dbAdapter: string; defaultLocale: string },
): Promise<void> {
  const mod = await import("../src/index.js");
  (mod as { scaffold: typeof scaffold }).scaffold(projectDir, opts);
}

describe("create-app scaffold", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(resolve(tmpdir(), "arche-cms-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true });
  });

  it("creates all required directories", async () => {
    const projectDir = resolve(tmpDir, "my-cms");
    await scaffold(projectDir, { dbAdapter: "sqlite", defaultLocale: "en" });
    expect(existsSync(resolve(projectDir, "cms/collections"))).toBe(true);
    expect(existsSync(resolve(projectDir, "cms/globals"))).toBe(true);
    expect(existsSync(resolve(projectDir, "cms/components"))).toBe(true);
  });

  it("creates package.json with correct structure", async () => {
    const projectDir = resolve(tmpDir, "test-app");
    await scaffold(projectDir, { dbAdapter: "sqlite", defaultLocale: "en" });
    const pkg = JSON.parse(readFileSync(resolve(projectDir, "package.json"), "utf-8"));
    expect(pkg.name).toBe("test-app");
    expect(pkg.scripts.dev).toBe("cms dev");
    expect(pkg.scripts.build).toBe("cms build");
    expect(pkg.scripts.start).toBe("cms start");
    expect(pkg.dependencies["@arche-cms/cms"]).toBe("^0.1.0");
  });

  it("creates .env with sqlite adapter", async () => {
    const projectDir = resolve(tmpDir, "sqlite-app");
    await scaffold(projectDir, { dbAdapter: "sqlite", defaultLocale: "en" });
    const env = readFileSync(resolve(projectDir, ".env"), "utf-8");
    expect(env).toContain("DB_ADAPTER=sqlite");
    expect(env).toContain('DB_URL="file:./cms.db"');
    expect(env).toContain("DEFAULT_LOCALE=en");
  });

  it("creates .env with postgres adapter", async () => {
    const projectDir = resolve(tmpDir, "pg-app");
    await scaffold(projectDir, { dbAdapter: "postgres", defaultLocale: "fr" });
    const env = readFileSync(resolve(projectDir, ".env"), "utf-8");
    expect(env).toContain("DB_ADAPTER=postgres");
    expect(env).toContain('DB_URL="postgresql://localhost:5432/mydb"');
    expect(env).toContain("DEFAULT_LOCALE=fr");
  });

  it("creates arche-cms.config.ts", async () => {
    const projectDir = resolve(tmpDir, "config-test");
    await scaffold(projectDir, { dbAdapter: "sqlite", defaultLocale: "ja" });
    const config = readFileSync(resolve(projectDir, "arche-cms.config.ts"), "utf-8");
    expect(config).toContain('database: { adapter: "sqlite" }');
    expect(config).toContain('localization: { defaultLocale: "ja" }');
  });

  it("creates example posts collection", async () => {
    const projectDir = resolve(tmpDir, "posts-test");
    await scaffold(projectDir, { dbAdapter: "sqlite", defaultLocale: "en" });
    const posts = readFileSync(resolve(projectDir, "cms/collections/posts.ts"), "utf-8");
    expect(posts).toContain('slug: "posts"');
    expect(posts).toContain('labels: { singular: "Post", plural: "Posts" }');
    expect(posts).toContain('text("title")');
  });

  it("creates example site-settings global", async () => {
    const projectDir = resolve(tmpDir, "global-test");
    await scaffold(projectDir, { dbAdapter: "sqlite", defaultLocale: "en" });
    const settings = readFileSync(resolve(projectDir, "cms/globals/site-settings.ts"), "utf-8");
    expect(settings).toContain('slug: "site-settings"');
    expect(settings).toContain('label: "Site Settings"');
  });

  it("creates .gitignore", async () => {
    const projectDir = resolve(tmpDir, "gitignore-test");
    await scaffold(projectDir, { dbAdapter: "sqlite", defaultLocale: "en" });
    const gi = readFileSync(resolve(projectDir, ".gitignore"), "utf-8");
    expect(gi).toContain("node_modules");
    expect(gi).toContain("*.db");
    expect(gi).toContain("uploads");
  });
});
