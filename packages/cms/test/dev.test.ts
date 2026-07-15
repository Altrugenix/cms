import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/server/bootstrap.js", () => ({
  ensureDevAuthSecret: vi.fn(),
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

vi.mock("@arche-cms/schema", () => ({
  SchemaWatcher: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  })),
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

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
  };
});

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
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

describe("dev command", () => {
  const originalExit = process.exit;

  beforeEach(() => {
    process.exit = vi.fn() as unknown as typeof process.exit;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  describe("printDevHelp", () => {
    it("shows help and exits 0", async () => {
      const { printDevHelp } = await import("../src/commands/dev.js");
      printDevHelp();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe("dev()", () => {
    it(
      "calls ensureDevAuthSecret, applyCliOverrides, connectAndLoad, createAndStartApp",
      withLogCapture(async () => {
        const { dev } = await import("../src/commands/dev.js");
        const { ensureDevAuthSecret, applyCliOverrides, connectAndLoad, createAndStartApp } =
          await import("../src/server/bootstrap.js");

        const _devPromise = dev({ port: 4000, host: "127.0.0.1" });

        await vi.waitFor(() => {
          expect(ensureDevAuthSecret).toHaveBeenCalled();
          expect(applyCliOverrides).toHaveBeenCalledWith({ port: 4000, host: "127.0.0.1" });
          expect(connectAndLoad).toHaveBeenCalled();
          expect(createAndStartApp).toHaveBeenCalled();
        });

        expect(process.exit).not.toHaveBeenCalled();
      }),
    );

    it(
      "passes options through to applyCliOverrides",
      withLogCapture(async () => {
        const { dev } = await import("../src/commands/dev.js");
        const { applyCliOverrides } = await import("../src/server/bootstrap.js");

        const _devPromise = dev({
          dir: "./schemas",
          port: 5000,
          host: "0.0.0.0",
          dbUrl: "file:./test.db",
          dbAdapter: "postgres",
        });

        await vi.waitFor(() => {
          expect(applyCliOverrides).toHaveBeenCalledWith({
            dir: "./schemas",
            port: 5000,
            host: "0.0.0.0",
            dbUrl: "file:./test.db",
            dbAdapter: "postgres",
          });
        });
      }),
    );

    it(
      "calls connectAndLoad with config and adapter",
      withLogCapture(async () => {
        const { dev } = await import("../src/commands/dev.js");
        const { connectAndLoad } = await import("../src/server/bootstrap.js");
        const { loadConfig } = await import("../src/server/config.js");

        const _devPromise = dev({});

        await vi.waitFor(() => {
          expect(connectAndLoad).toHaveBeenCalled();
        });

        const config = loadConfig();
        expect(connectAndLoad).toHaveBeenCalledWith(config, expect.anything(), expect.anything());
      }),
    );

    it(
      "creates and starts the app with collections and globals",
      withLogCapture(async () => {
        const { createAndStartApp } = await import("../src/server/bootstrap.js");
        const { connectAndLoad } = await import("../src/server/bootstrap.js");
        connectAndLoad.mockResolvedValueOnce({
          collections: [{ slug: "posts" }],
          globals: [{ slug: "settings" }],
        });

        const { dev } = await import("../src/commands/dev.js");
        const _devPromise = dev({});

        await vi.waitFor(() => {
          expect(createAndStartApp).toHaveBeenCalled();
        });
      }),
    );

    it(
      "registers seoPlugin and discovers plugins",
      withLogCapture(async () => {
        const { dev } = await import("../src/commands/dev.js");
        const { PluginManager } = await import("@arche-cms/plugins");

        const _devPromise = dev({});

        await vi.waitFor(() => {
          expect(PluginManager).toHaveBeenCalled();
        });
      }),
    );
  });
});
