import { describe, it, expect } from "vitest";
import { discoverPlugins } from "../src/discovery.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function tmpDir(suffix: string) {
  return join(tmpdir(), `arche-disc-branch-${Date.now()}-${suffix}`);
}

describe("discoverPlugins — branches", () => {
  it("line 61: falls back to default dist/index.js when package.json has no main and no dist/index.js", async () => {
    const dir = tmpDir("no-main-no-dist");
    const pkgDir = join(dir, "node_modules", "arche-cms-plugin-nomd");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, "package.json"), JSON.stringify({ name: "arche-cms-plugin-nomd" }));

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("line 54: uses mod when mod.default is undefined (ESM no default export)", async () => {
    const dir = tmpDir("esm-no-default");
    const pkgDir = join(dir, "node_modules", "arche-cms-plugin-esm");
    const distDir = join(pkgDir, "dist");
    mkdirSync(distDir, { recursive: true });
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: "arche-cms-plugin-esm", type: "module" }),
    );
    writeFileSync(
      join(distDir, "index.js"),
      'export const slug = "esm-plugin";\nexport const name = "ESM Plugin";\n',
    );

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toHaveLength(1);
      expect(plugins[0]?.slug).toBe("esm");
      expect(plugins[0]?.definition.slug).toBe("esm-plugin");
      expect(plugins[0]?.definition.name).toBe("ESM Plugin");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("line 63: fallback path uses mod when mod.default is undefined (ESM no default)", async () => {
    const dir = tmpDir("fallback-esm-no-default");
    const pkgDir = join(dir, "node_modules", "arche-cms-plugin-fallback-esm");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({
        name: "arche-cms-plugin-fallback-esm",
        type: "module",
        main: "lib/index.js",
      }),
    );
    const libDir = join(pkgDir, "lib");
    mkdirSync(libDir, { recursive: true });
    writeFileSync(
      join(libDir, "index.js"),
      'export const slug = "fb-esm";\nexport const name = "Fallback ESM";\n',
    );

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toHaveLength(1);
      expect(plugins[0]?.slug).toBe("fallback-esm");
      expect(plugins[0]?.definition.slug).toBe("fb-esm");
      expect(plugins[0]?.definition.name).toBe("Fallback ESM");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("line 61: fallback to default dist/index.js when package.json has no main but dist/index.js exists", async () => {
    const dir = tmpDir("no-main-with-valid-dist");
    const pkgDir = join(dir, "node_modules", "arche-cms-plugin-nmvd");
    const distDir = join(pkgDir, "dist");
    mkdirSync(distDir, { recursive: true });
    writeFileSync(join(pkgDir, "package.json"), JSON.stringify({ name: "arche-cms-plugin-nmvd" }));
    writeFileSync(
      join(distDir, "index.js"),
      'module.exports = { slug: "nmvd", name: "No Main Valid Dist" };',
    );

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toHaveLength(1);
      expect(plugins[0]?.slug).toBe("nmvd");
      expect(plugins[0]?.definition.name).toBe("No Main Valid Dist");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("line 54: CJS module.exports default is used (covers mod.default truthy branch)", async () => {
    const dir = tmpDir("cjs-default");
    const pkgDir = join(dir, "node_modules", "arche-cms-plugin-cjsdef");
    const distDir = join(pkgDir, "dist");
    mkdirSync(distDir, { recursive: true });
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: "arche-cms-plugin-cjsdef" }),
    );
    writeFileSync(
      join(distDir, "index.js"),
      'module.exports = { slug: "cjsdef", name: "CJS Default Plugin" };',
    );

    try {
      const plugins = await discoverPlugins(dir);
      expect(plugins).toHaveLength(1);
      expect(plugins[0]?.slug).toBe("cjsdef");
      expect(plugins[0]?.definition.name).toBe("CJS Default Plugin");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
