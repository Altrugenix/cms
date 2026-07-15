import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/server/bootstrap.js", () => ({
  applyCliOverrides: vi.fn(),
  autoCreateSqlite: vi.fn(),
  connectAndLoad: vi.fn().mockResolvedValue({ collections: [], globals: [] }),
  createAndStartApp: vi.fn().mockResolvedValue({ stop: vi.fn() }),
}));

vi.mock("../src/server/config.js", () => ({
  loadConfig: vi.fn().mockReturnValue({
    port: 3000,
    host: "0.0.0.0",
    logger: { level: "silent" },
    cors: { origin: "*" },
    rateLimit: { max: 100, timeWindow: "1 minute" },
    swagger: { title: "Test", version: "0.0.1", description: "Test" },
    schema: { baseDir: "./cms" },
    database: { adapter: "sqlite", url: ":memory:" },
    auth: { secret: "test-secret-32-chars-long-here-ok!" },
    storage: { baseDir: "./uploads" },
  }),
}));

vi.mock("@arche-cms/database", () => ({
  SQLiteAdapter: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createPostgresAdapter: vi.fn(),
}));

vi.mock("@arche-cms/plugins", () => ({
  PluginManager: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    runRouteHook: vi.fn(),
    getCustomFields: vi.fn().mockReturnValue({}),
    getAdminPanels: vi.fn().mockReturnValue([]),
  })),
  seoPlugin: { definition: { slug: "seo" } },
  discoverPlugins: vi.fn().mockResolvedValue([]),
}));

vi.mock("@arche-cms/core", () => ({
  EventBus: vi.fn(),
  Lifecycle: vi.fn(),
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

function withLogCapture(fn: (lines: string[]) => Promise<void>): () => Promise<void> {
  return async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.join(" "));
    });
    try {
      await fn(lines);
    } finally {
      spy.mockRestore();
    }
  };
}

describe("start command", () => {
  const originalExit = process.exit;

  beforeEach(() => {
    process.exit = vi.fn() as unknown as typeof process.exit;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe("printStartHelp", () => {
    it("shows help and exits 0", async () => {
      const { printStartHelp } = await import("../src/commands/start.js");
      printStartHelp();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe("start()", () => {
    it(
      "calls applyCliOverrides, connectAndLoad, createAndStartApp",
      withLogCapture(async () => {
        const { start } = await import("../src/commands/start.js");
        const { applyCliOverrides, connectAndLoad, createAndStartApp, autoCreateSqlite } =
          await import("../src/server/bootstrap.js");

        const _startPromise = start({ port: 4000, host: "127.0.0.1" });

        await vi.waitFor(() => {
          expect(applyCliOverrides).toHaveBeenCalledWith({ port: 4000, host: "127.0.0.1" });
          expect(autoCreateSqlite).toHaveBeenCalled();
          expect(connectAndLoad).toHaveBeenCalled();
          expect(createAndStartApp).toHaveBeenCalled();
        });

        expect(process.exit).not.toHaveBeenCalled();
      }),
    );

    it(
      "passes all options through to applyCliOverrides",
      withLogCapture(async () => {
        const { start } = await import("../src/commands/start.js");
        const { applyCliOverrides } = await import("../src/server/bootstrap.js");

        const _startPromise = start({
          dir: "./schemas",
          port: 5000,
          host: "0.0.0.0",
          dbUrl: "file:./prod.db",
          dbAdapter: "postgres",
        });

        await vi.waitFor(() => {
          expect(applyCliOverrides).toHaveBeenCalledWith({
            dir: "./schemas",
            port: 5000,
            host: "0.0.0.0",
            dbUrl: "file:./prod.db",
            dbAdapter: "postgres",
          });
        });
      }),
    );

    it(
      "calls connectAndLoad with config and adapter",
      withLogCapture(async () => {
        const { start } = await import("../src/commands/start.js");
        const { connectAndLoad } = await import("../src/server/bootstrap.js");
        const { loadConfig } = await import("../src/server/config.js");

        const _startPromise = start({});

        await vi.waitFor(() => {
          expect(connectAndLoad).toHaveBeenCalled();
        });

        const config = loadConfig();
        expect(connectAndLoad).toHaveBeenCalledWith(config, expect.anything(), expect.anything());
      }),
    );

    it(
      "creates and starts the app",
      withLogCapture(async () => {
        const { start } = await import("../src/commands/start.js");
        const { createAndStartApp } = await import("../src/server/bootstrap.js");

        const _startPromise = start({});

        await vi.waitFor(() => {
          expect(createAndStartApp).toHaveBeenCalled();
        });
      }),
    );

    it(
      "handles empty options",
      withLogCapture(async () => {
        const { start } = await import("../src/commands/start.js");
        const { applyCliOverrides, autoCreateSqlite } = await import("../src/server/bootstrap.js");

        const _startPromise = start({});

        await vi.waitFor(() => {
          expect(applyCliOverrides).toHaveBeenCalledWith({});
          expect(autoCreateSqlite).toHaveBeenCalled();
        });
      }),
    );

    it(
      "registers seoPlugin via PluginManager",
      withLogCapture(async () => {
        const { start } = await import("../src/commands/start.js");
        const { PluginManager } = await import("@arche-cms/plugins");

        const _startPromise = start({});

        await vi.waitFor(() => {
          expect(PluginManager).toHaveBeenCalled();
        });
      }),
    );
  });
});
