import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

describe("loadConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AUTH_SECRET", "test-secret-32-chars-long-here-ok!");
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses defaults when no env vars set", async () => {
    const { loadConfig } = await import("../src/server/config.js");
    const config = loadConfig();
    expect(config.port).toBe(3500);
    expect(config.host).toBe("0.0.0.0");
    expect(config.logger.level).toBe("info");
    expect(config.cors.origin).toEqual(["http://localhost:5173"]);
    expect(config.database.adapter).toBe("sqlite");
    expect(config.database.url).toBe("file:./cms.db");
    expect(config.auth.accessTokenExpiresIn).toBe("15m");
    expect(config.auth.refreshTokenExpiresIn).toBe("7d");
    expect(config.storage.baseDir).toBe("./uploads");
  });

  it("reads PORT and HOST from env", async () => {
    vi.stubEnv("PORT", "4000");
    vi.stubEnv("HOST", "127.0.0.1");
    const { loadConfig } = await import("../src/server/config.js");
    const config = loadConfig();
    expect(config.port).toBe(4000);
    expect(config.host).toBe("127.0.0.1");
  });

  it("parses CORS_ORIGIN as comma-separated list", async () => {
    vi.stubEnv("CORS_ORIGIN", "http://localhost:3000,https://example.com");
    const { loadConfig } = await import("../src/server/config.js");
    const config = loadConfig();
    expect(config.cors.origin).toEqual(["http://localhost:3000", "https://example.com"]);
  });

  it("reads LOG_LEVEL from env", async () => {
    vi.stubEnv("LOG_LEVEL", "debug");
    const { loadConfig } = await import("../src/server/config.js");
    const config = loadConfig();
    expect(config.logger.level).toBe("debug");
  });

  it("reads RATE_LIMIT_* from env", async () => {
    vi.stubEnv("RATE_LIMIT_MAX", "50");
    vi.stubEnv("RATE_LIMIT_WINDOW", "30 seconds");
    const { loadConfig } = await import("../src/server/config.js");
    const config = loadConfig();
    expect(config.rateLimit.max).toBe(50);
    expect(config.rateLimit.timeWindow).toBe("30 seconds");
  });

  it("reads SWAGGER_* from env", async () => {
    vi.stubEnv("SWAGGER_TITLE", "Custom API");
    vi.stubEnv("SWAGGER_VERSION", "2.0.0");
    vi.stubEnv("SWAGGER_DESCRIPTION", "Custom desc");
    const { loadConfig } = await import("../src/server/config.js");
    const config = loadConfig();
    expect(config.swagger.title).toBe("Custom API");
    expect(config.swagger.version).toBe("2.0.0");
    expect(config.swagger.description).toBe("Custom desc");
  });

  it("reads SCHEMA_DIR from env", async () => {
    vi.stubEnv("SCHEMA_DIR", "./schemas");
    const { loadConfig } = await import("../src/server/config.js");
    const config = loadConfig();
    expect(config.schema.baseDir).toBe("./schemas");
  });

  it("reads DB_* from env", async () => {
    vi.stubEnv("DB_ADAPTER", "postgres");
    vi.stubEnv("DB_URL", "postgres://localhost:5432/mydb");
    const { loadConfig } = await import("../src/server/config.js");
    const config = loadConfig();
    expect(config.database.adapter).toBe("postgres");
    expect(config.database.url).toBe("postgres://localhost:5432/mydb");
  });

  it("reads AUTH_* from env", async () => {
    vi.stubEnv("AUTH_ACCESS_EXPIRES", "30m");
    vi.stubEnv("AUTH_REFRESH_EXPIRES", "30d");
    const { loadConfig } = await import("../src/server/config.js");
    const config = loadConfig();
    expect(config.auth.accessTokenExpiresIn).toBe("30m");
    expect(config.auth.refreshTokenExpiresIn).toBe("30d");
  });

  it("reads STORAGE_DIR from env", async () => {
    vi.stubEnv("STORAGE_DIR", "/data/uploads");
    const { loadConfig } = await import("../src/server/config.js");
    const config = loadConfig();
    expect(config.storage.baseDir).toBe("/data/uploads");
  });

  it("throws when AUTH_SECRET is missing", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    const { loadConfig } = await import("../src/server/config.js");
    expect(() => loadConfig()).toThrow("AUTH_SECRET environment variable is required");
  });
});
