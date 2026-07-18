import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createConfigLoader } from "../src/config.js";

describe("createConfigLoader - loadFile with real file", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "config-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { force: true, recursive: true });
  });

  it("reads and parses a valid JSON config file", async () => {
    const config = { debug: true, name: "test-app", port: 3000 };
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

    const loader = createConfigLoader({ configFile: "custom.config.json", cwd: testDir });
    const result = await loader.loadFile();

    expect(result.db).toBe("sqlite://local.db");
  });

  it("load merges file and env, env overrides file", async () => {
    const config = { name: "from-file", port: 3000 };
    writeFileSync(join(testDir, "cms.config.json"), JSON.stringify(config), "utf-8");

    process.env.CMS_PORT = "5000";
    const loader = createConfigLoader({ cwd: testDir, envPrefix: "CMS_" });
    const result = await loader.load();

    expect(result.port).toBe(5000);
    expect(result.name).toBe("from-file");

    delete process.env.CMS_PORT;
  });
});
