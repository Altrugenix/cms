import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("playground-firebase scaffold", () => {
  it("has arche-cms.config.ts", () => {
    expect(existsSync(resolve(root, "arche-cms.config.ts"))).toBe(true);
  });

  it("config does not reference database adapter", () => {
    const config = readFileSync(resolve(root, "arche-cms.config.ts"), "utf-8");
    expect(config).not.toContain("database:");
  });

  it("has .env with firebase backend mode", () => {
    const env = readFileSync(resolve(root, ".env"), "utf-8");
    expect(env).toContain("VITE_BACKEND_MODE=firebase"); // eslint-disable-line no-secrets/no-secrets
    expect(env).toContain("VITE_FIREBASE_API_KEY=");
  });

  it("has cms/collections directory with schema files", () => {
    const collectionsDir = resolve(root, "cms/collections");
    expect(existsSync(collectionsDir)).toBe(true);
    expect(existsSync(resolve(collectionsDir, "posts.ts"))).toBe(true);
  });

  it("has cms/globals directory with schema files", () => {
    const globalsDir = resolve(root, "cms/globals");
    expect(existsSync(globalsDir)).toBe(true);
    expect(existsSync(resolve(globalsDir, "site-settings.ts"))).toBe(true);
  });

  it("package.json depends on @arche-cms/cms-firebase", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));
    expect(pkg.dependencies["@arche-cms/cms-firebase"]).toBe("workspace:*");
  });
});
