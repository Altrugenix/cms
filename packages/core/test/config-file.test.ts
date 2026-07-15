import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createConfigLoader } from "../src/config.js";

describe("createConfigLoader - loadFile with real file", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "config-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("reads and parses a valid JSON config file", async () => {
    const config = { port: 3000, debug: true, name: "test-app" };
    writeFileSync(join(testDir, "cms.config.json"), JSON.stringify(config), "utf-8");

    const loader = createConfigLoader({ cwd: testDir });
    const result = await loader.loadFile();

    expect(result.port).toBe(3000);
    expect(result.debug).toBe(true);
    expect(result.name).toBe("test-app");
  });

  it("uses custom configFile name", async () => {
    const config = { db: "sqlite://local.db" };
    writeFileSync(join(testDir, "custom.config.json"), JSON.stringify(config), "utf-8");

    const loader = createConfigLoader({ cwd: testDir, configFile: "custom.config.json" });
    const result = await loader.loadFile();

    expect(result.db).toBe("sqlite://local.db");
  });

  it("load merges file and env, env overrides file", async () => {
    const config = { port: 3000, name: "from-file" };
    writeFileSync(join(testDir, "cms.config.json"), JSON.stringify(config), "utf-8");

    process.env.CMS_PORT = "5000";
    const loader = createConfigLoader({ cwd: testDir, envPrefix: "CMS_" });
    const result = await loader.load();

    expect(result.port).toBe(5000);
    expect(result.name).toBe("from-file");

    delete process.env.CMS_PORT;
  });
});
