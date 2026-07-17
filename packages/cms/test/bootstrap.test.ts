import { mkdtempSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

interface MockConfig {
  database: { adapter: string; url: string };
  schema?: { baseDir: string };
  logger?: { level: string };
  port?: number;
  host?: string;
}

interface MockLogger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
}

const ORIGINAL_ENV = { ...process.env };

describe("resolveDbPath", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("extracts path from file: prefix", async () => {
    const { resolveDbPath } = await import("../src/server/bootstrap.js");
    expect(resolveDbPath("file:./cms.db")).toBe("./cms.db");
  });

  it("returns :memory: for file: with empty path", async () => {
    const { resolveDbPath } = await import("../src/server/bootstrap.js");
    expect(resolveDbPath("file:")).toBe(":memory:");
  });

  it("returns non-file URLs as-is", async () => {
    const { resolveDbPath } = await import("../src/server/bootstrap.js");
    expect(resolveDbPath("postgres://localhost:5432/db")).toBe("postgres://localhost:5432/db");
  });
});

describe("autoCreateSqlite", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cms-bootstrap-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { force: true, recursive: true });
    process.env = { ...ORIGINAL_ENV };
  });

  function autoCreateSqliteConfig(adapter: string, url: string): MockConfig {
    return { database: { adapter, url } };
  }

  it("creates SQLite db file if it does not exist", async () => {
    const { autoCreateSqlite } = await import("../src/server/bootstrap.js");
    const logger: MockLogger = { info: vi.fn(), warn: vi.fn() };
    const dbPath = join(tmpDir, "test.db");

    expect(existsSync(dbPath)).toBe(false);
    autoCreateSqlite(autoCreateSqliteConfig("sqlite", `file:${dbPath}`), logger);
    expect(existsSync(dbPath)).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("Creating SQLite database"));
  });

  it("does not create file for :memory:", async () => {
    const { autoCreateSqlite } = await import("../src/server/bootstrap.js");
    const logger: MockLogger = { info: vi.fn(), warn: vi.fn() };

    autoCreateSqlite(autoCreateSqliteConfig("sqlite", "file:"), logger);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("does nothing for non-sqlite adapters", async () => {
    const { autoCreateSqlite } = await import("../src/server/bootstrap.js");
    const logger: MockLogger = { info: vi.fn(), warn: vi.fn() };

    autoCreateSqlite(autoCreateSqliteConfig("postgres", "postgres://localhost/db"), logger);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("does nothing if db file already exists", async () => {
    const { autoCreateSqlite } = await import("../src/server/bootstrap.js");
    const logger: MockLogger = { info: vi.fn(), warn: vi.fn() };
    const dbPath = join(tmpDir, "existing.db");
    writeFileSync(dbPath, "");

    autoCreateSqlite(autoCreateSqliteConfig("sqlite", `file:${dbPath}`), logger);
    expect(logger.info).not.toHaveBeenCalled();
  });
});

describe("ensureDevAuthSecret", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("sets dev secret when AUTH_SECRET is not set", async () => {
    delete process.env.AUTH_SECRET;
    const { ensureDevAuthSecret } = await import("../src/server/bootstrap.js");
    const logger: MockLogger = { info: vi.fn(), warn: vi.fn() };
    ensureDevAuthSecret(logger);
    expect(process.env.AUTH_SECRET).toBe("dev-secret-do-not-use-in-production");
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("AUTH_SECRET not set"));
  });

  it("does not override existing AUTH_SECRET", async () => {
    process.env.AUTH_SECRET = "real-secret";
    const { ensureDevAuthSecret } = await import("../src/server/bootstrap.js");
    const logger: MockLogger = { info: vi.fn(), warn: vi.fn() };
    ensureDevAuthSecret(logger);
    expect(process.env.AUTH_SECRET).toBe("real-secret");
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe("applyCliOverrides", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("sets PORT from options", async () => {
    const { applyCliOverrides } = await import("../src/server/bootstrap.js");
    applyCliOverrides({ port: 4000 });
    expect(process.env.PORT).toBe("4000");
  });

  it("sets HOST from options", async () => {
    const { applyCliOverrides } = await import("../src/server/bootstrap.js");
    applyCliOverrides({ host: "127.0.0.1" });
    expect(process.env.HOST).toBe("127.0.0.1");
  });

  it("sets SCHEMA_DIR from options", async () => {
    const { applyCliOverrides } = await import("../src/server/bootstrap.js");
    applyCliOverrides({ dir: "./schemas" });
    expect(process.env.SCHEMA_DIR).toBe("./schemas");
  });

  it("sets DB_URL from options", async () => {
    const { applyCliOverrides } = await import("../src/server/bootstrap.js");
    applyCliOverrides({ dbUrl: "file:./test.db" });
    expect(process.env.DB_URL).toBe("file:./test.db");
  });

  it("sets DB_ADAPTER from options", async () => {
    const { applyCliOverrides } = await import("../src/server/bootstrap.js");
    applyCliOverrides({ dbAdapter: "postgres" });
    expect(process.env.DB_ADAPTER).toBe("postgres");
  });
});

describe("connectAndLoad", () => {
  it("loads schemas and applies auto-migrations", async () => {
    const { connectAndLoad } = await import("../src/server/bootstrap.js");
    const mockAdapter = {
      connect: vi.fn(),
      getExecutedMigrations: vi.fn().mockResolvedValue([]),
      getExistingSchema: vi.fn().mockResolvedValue({ tables: new Map() }),
      raw: vi.fn(),
      runMigration: vi.fn().mockResolvedValue(undefined),
      transaction: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
    };
    const config = {
      database: { adapter: "sqlite", url: ":memory:" },
      logger: { level: "silent" },
      schema: { baseDir: "./cms" },
    };
    const result = await connectAndLoad(config as never, mockAdapter as never);
    expect(mockAdapter.connect).toHaveBeenCalled();
    expect(mockAdapter.raw).toHaveBeenCalledWith("SELECT 1");
    expect(result.collections).toEqual([]);
    expect(result.globals).toEqual([]);
  });
});

describe("createAndStartApp", () => {
  it("creates Fastify app and starts listening", async () => {
    vi.mock("../src/server/app.js", () => ({
      createApp: vi.fn().mockResolvedValue({
        addHook: vi.fn(),
        close: vi.fn(),
        inject: vi.fn(),
        listen: vi.fn(),
        log: { info: vi.fn(), warn: vi.fn() },
      }),
    }));
    vi.mock("../src/server/services/scheduled-publisher.js", () => ({
      createScheduledPublisher: vi.fn().mockReturnValue({ stop: vi.fn() }),
    }));
    vi.mock("../src/server/plugins/static.js", () => ({
      registerAdminStatic: vi.fn(),
    }));

    const { createAndStartApp } = await import("../src/server/bootstrap.js");
    const adapter = { connect: vi.fn(), raw: vi.fn() };
    const result = await createAndStartApp(
      {
        database: { adapter: "sqlite", url: ":memory:" },
        host: "127.0.0.1",
        logger: { level: "silent" },
        port: 3001,
      } as never,
      adapter as never,
      [],
      [],
    );
    expect(result.stop).toBeDefined();
    result.stop();
  });
});
