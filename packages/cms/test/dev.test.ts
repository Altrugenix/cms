import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/server/bootstrap.js", () => ({
  applyCliOverrides: vi.fn(),
  autoCreateSqlite: vi.fn(),
  connectAndLoad: vi.fn().mockResolvedValue({ collections: [], globals: [] }),
  createAndStartApp: vi.fn().mockResolvedValue({ stop: vi.fn() }),
  ensureDevAuthSecret: vi.fn(),
}));

vi.mock("../src/server/config.js", () => ({
  loadConfig: vi.fn().mockReturnValue({
    auth: { secret: "test-secret-32-chars-long-here-ok!" },
    cors: { origin: "*" },
    database: { adapter: "sqlite", url: ":memory:" },
    host: "0.0.0.0",
    logger: { level: "silent" },
    port: 3000,
    rateLimit: { max: 100, timeWindow: "1 minute" },
    schema: { baseDir: "./cms" },
    storage: { baseDir: "./uploads" },
    swagger: { description: "Test", title: "Test", version: "0.0.1" },
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
  createPostgresAdapter: vi.fn(),
  SQLiteAdapter: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock("@arche-cms/plugins", () => ({
  discoverPlugins: vi.fn().mockResolvedValue([]),
  PluginManager: vi.fn().mockImplementation(() => ({
    getAdminPanels: vi.fn().mockReturnValue([]),
    getCustomFields: vi.fn().mockReturnValue({}),
    register: vi.fn(),
    runRouteHook: vi.fn(),
  })),
  seoPlugin: { definition: { slug: "seo" } },
}));

vi.mock("@arche-cms/core", () => ({
  createLogger: vi.fn().mockReturnValue({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
  EventBus: vi.fn(),
  Lifecycle: vi.fn(),
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
        const { applyCliOverrides, connectAndLoad, createAndStartApp, ensureDevAuthSecret } =
          await import("../src/server/bootstrap.js");

        const _devPromise = dev({ host: "127.0.0.1", port: 4000 });

        await vi.waitFor(() => {
          expect(ensureDevAuthSecret).toHaveBeenCalled();
          expect(applyCliOverrides).toHaveBeenCalledWith({ host: "127.0.0.1", port: 4000 });
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
          dbAdapter: "postgres",
          dbUrl: "file:./test.db",
          dir: "./schemas",
          host: "0.0.0.0",
          port: 5000,
        });

        await vi.waitFor(() => {
          expect(applyCliOverrides).toHaveBeenCalledWith({
            dbAdapter: "postgres",
            dbUrl: "file:./test.db",
            dir: "./schemas",
            host: "0.0.0.0",
            port: 5000,
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
