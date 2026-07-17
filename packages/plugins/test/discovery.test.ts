import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

import { discoverPlugins } from "../src/discovery.js";

function tmpDir(suffix: string) {
  return join(tmpdir(), `arche-disc-test-${Date.now()}-${suffix}`);
}

function writeFlatPlugin(base: string, name: string, exports: string) {
  const pkgDir = join(base, "node_modules", name);
  const distDir = join(pkgDir, "dist");
  mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, "index.js"), exports);
  return pkgDir;
}

function writeFlatFallbackPlugin(base: string, name: string, mainPath: string, exports: string) {
  const pkgDir = join(base, "node_modules", name);
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(join(pkgDir, "package.json"), JSON.stringify({ main: mainPath, name }));
  const fullMain = join(pkgDir, mainPath);
  const parent = fullMain.substring(0, fullMain.lastIndexOf("/"));
  mkdirSync(parent, { recursive: true });
  writeFileSync(fullMain, exports);
  return pkgDir;
}

describe("discoverPlugins", () => {
  it("returns empty array when node_modules does not exist", async () => {
    const dir = tmpDir("no-modules");
    const plugins = await discoverPlugins(dir);
    expect(plugins).toEqual([]);
  });

  it("returns empty array when no matching prefixes found", async () => {
    const dir = tmpDir("no-match");
    const nmDir = join(dir, "node_modules", "lodash");
    mkdirSync(nmDir, { recursive: true });
    const plugins = await discoverPlugins(dir);
    expect(plugins).toEqual([]);
  });

  it("uses process.cwd() when fromDir is omitted", async () => {
    const plugins = await discoverPlugins();
    expect(Array.isArray(plugins)).toBe(true);
  });

  it("discovers plugin from arche-cms-plugin- prefix", async () => {
    const dir = tmpDir("prefix-arche");
    writeFlatPlugin(
      dir,
      "arche-cms-plugin-test",
      'module.exports = { slug: "test", name: "Test Plugin" };',
    );

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toHaveLength(1);
      expect(plugins[0]?.slug).toBe("test");
      expect(plugins[0]?.definition.name).toBe("Test Plugin");
      expect(plugins[0]?.path).toContain("arche-cms-plugin-test");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("discovers plugin from symlink entry", async () => {
    const dir = tmpDir("symlink");
    writeFlatPlugin(
      dir,
      "arche-cms-plugin-linked",
      'module.exports = { slug: "linked", name: "Linked Plugin" };',
    );
    const pkgPath = join(dir, "node_modules", "arche-cms-plugin-linked");
    const linkPath = join(dir, "node_modules", "arche-cms-plugin-linked-link");
    const { symlinkSync } = await import("node:fs");
    symlinkSync(pkgPath, linkPath);

    try {
      const plugins = await discoverPlugins(dir);
      const slugs = plugins.map((p) => p.slug);
      expect(slugs).toContain("linked");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("skips file entries (not directory or symlink)", async () => {
    const dir = tmpDir("file-entry");
    const nmDir = join(dir, "node_modules");
    mkdirSync(nmDir, { recursive: true });
    writeFileSync(join(nmDir, "arche-cms-plugin-test"), "not a directory");

    const plugins = await discoverPlugins(dir);
    expect(plugins).toEqual([]);
  });

  it("returns null when dist/index.js has no valid definition", async () => {
    const dir = tmpDir("bad-exports");
    writeFlatPlugin(dir, "arche-cms-plugin-bad", "module.exports = {};");

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toEqual([]);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("falls back to package.json main field", async () => {
    const dir = tmpDir("fallback");
    writeFlatFallbackPlugin(
      dir,
      "arche-cms-plugin-fallback",
      "lib/index.js",
      'module.exports = { slug: "fallback", name: "Fallback Plugin" };',
    );

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toHaveLength(1);
      expect(plugins[0]?.slug).toBe("fallback");
      expect(plugins[0]?.definition.name).toBe("Fallback Plugin");
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("returns null when fallback import also fails", async () => {
    const dir = tmpDir("fallback-fail");
    const pkgDir = join(dir, "node_modules", "arche-cms-plugin-nofallback");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({ main: "lib/index.js", name: "nofallback" }),
    );

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toEqual([]);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("fallback returns null when default has no valid definition", async () => {
    const dir = tmpDir("fallback-noslug");
    writeFlatFallbackPlugin(dir, "arche-cms-plugin-noslug", "lib/index.js", "module.exports = {};");

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toEqual([]);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it("discovers multiple plugins at once", async () => {
    const dir = tmpDir("multi");
    writeFlatPlugin(
      dir,
      "arche-cms-plugin-alpha",
      'module.exports = { slug: "alpha", name: "Alpha" };',
    );
    writeFlatPlugin(
      dir,
      "arche-cms-plugin-beta",
      'module.exports = { slug: "beta", name: "Beta" };',
    );

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toHaveLength(2);
      const slugs = plugins.map((p) => p.slug).sort();
      expect(slugs).toEqual(["alpha", "beta"]);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
