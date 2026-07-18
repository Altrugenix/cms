import { describe, it, expect, beforeEach } from "vitest";

import { createConfigLoader } from "../src/config.js";

describe("createConfigLoader", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    const keys = Object.keys(process.env).filter((k) => k.startsWith("CMS_"));
    for (const key of keys) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[key];
    }
  });

  describe("loadEnv", () => {
    it("reads env vars with prefix", async () => {
      process.env.CMS_PORT = "4000";
      process.env.CMS_DB_URL = "sqlite://test.db";

      const loader = createConfigLoader({ envPrefix: "CMS_" });
      const config = await loader.loadEnv();

      expect(config.port).toBe(4000);
      expect(config.dbUrl).toBe("sqlite://test.db");
    });

    it("ignores env vars without prefix", async () => {
      process.env.PORT = "3000";
      process.env.CMS_PORT = "4000";

      const loader = createConfigLoader({ envPrefix: "CMS_" });
      const config = await loader.loadEnv();

      expect(config.port).toBe(4000);
      expect(config).not.toHaveProperty("PORT");
    });

    it("parses boolean values", async () => {
      process.env.CMS_DEBUG = "true";
      process.env.CMS_FEATURE_X = "false";

      const loader = createConfigLoader({ envPrefix: "CMS_" });
      const config = await loader.loadEnv();

      expect(config.debug).toBe(true);
      expect(config.featureX).toBe(false);
    });

    it("parses null and undefined", async () => {
      process.env.CMS_NULL_VAL = "null";
      process.env.CMS_UNDEFINED_VAL = "undefined";

      const loader = createConfigLoader({ envPrefix: "CMS_" });
      const config = await loader.loadEnv();

      expect(config.nullVal).toBeNull();
      expect(config.undefinedVal).toBeUndefined();
    });

    it("camelCases env var keys", async () => {
      process.env.CMS_DATABASE_CONNECTION_STRING = "pg://localhost";

      const loader = createConfigLoader({ envPrefix: "CMS_" });
      const config = await loader.loadEnv();

      expect(config.databaseConnectionString).toBe("pg://localhost");
    });

    it("returns empty object when no matching vars", async () => {
      const loader = createConfigLoader({ envPrefix: "CMS_" });
      const config = await loader.loadEnv();
      expect(config).toEqual({});
    });
  });

  describe("loadFile", () => {
    it("returns empty object when config file does not exist", async () => {
      const loader = createConfigLoader({ cwd: "/tmp/nonexistent-dir-12345" });
      const config = await loader.loadFile();
      expect(config).toEqual({});
    });
  });

  describe("load", () => {
    it("merges config with env overriding file", async () => {
      process.env.CMS_PORT = "5000";

      const loader = createConfigLoader({
        cwd: "/tmp/nonexistent-dir-12345",
        envPrefix: "CMS_",
      });
      const config = await loader.load();

      expect(config.port).toBe(5000);
    });
  });

  describe("custom options", () => {
    it("uses custom cwd and envPrefix", async () => {
      process.env.MYAPP_SECRET = "s3cr3t";

      const loader = createConfigLoader({
        cwd: "/tmp",
        envPrefix: "MYAPP_",
      });
      const config = await loader.loadEnv();

      expect(config.secret).toBe("s3cr3t");
    });
  });
});
