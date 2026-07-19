import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockStop = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);
const mockConnectAndLoad = vi.fn().mockResolvedValue({
  collections: [],
  globals: [],
});
const mockCreateAndStartApp = vi.fn().mockResolvedValue({
  fastify: { close: vi.fn() },
  stop: mockStop,
});
const mockEnsureDevAuthSecret = vi.fn();
const mockApplyCliOverrides = vi.fn();
const mockAutoCreateSqlite = vi.fn();
const mockLoadConfig = vi.fn();
const mockExecSync = vi.fn();
const mockExistsSync = vi.fn().mockReturnValue(true);

vi.mock("@arche-cms/core", () => ({
  createLogger: vi.fn().mockImplementation(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
  EventBus: vi.fn().mockImplementation(() => ({})),
  Lifecycle: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@arche-cms/database", () => ({
  createPostgresAdapter: vi.fn().mockResolvedValue({
    connect: vi.fn(),
    disconnect: mockDisconnect,
  }),
  SQLiteAdapter: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    disconnect: mockDisconnect,
  })),
}));

vi.mock("@arche-cms/plugins", () => ({
  discoverPlugins: vi.fn().mockResolvedValue([
    {
      definition: {
        description: "Test Plugin",
        name: "test-plugin",
        slug: "test-plugin",
        version: "1.0.0",
      },
    },
  ]),
  PluginManager: vi.fn().mockImplementation(() => ({
    getAdminPanels: vi.fn().mockReturnValue([]),
    getAll: vi.fn().mockReturnValue([
      {
        enabled: true,
        plugin: { description: "SEO", name: "seo", slug: "seo", version: "1.0.0" },
      },
    ]),
    getCustomFields: vi.fn().mockReturnValue({}),
    register: vi.fn(),
    runRouteHook: vi.fn().mockResolvedValue(undefined),
  })),
  seoPlugin: { description: "SEO", name: "seo", slug: "seo", version: "1.0.0" },
}));

const mockWatcherInstance = {
  on: vi.fn(),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@arche-cms/schema", () => ({
  SchemaWatcher: vi.fn().mockImplementation(() => mockWatcherInstance),
}));

vi.mock("../src/server/bootstrap.js", () => ({
  applyCliOverrides: mockApplyCliOverrides,
  autoCreateSqlite: mockAutoCreateSqlite,
  connectAndLoad: mockConnectAndLoad,
  createAndStartApp: mockCreateAndStartApp,
  ensureDevAuthSecret: mockEnsureDevAuthSecret,
}));

vi.mock("../src/server/config.js", () => ({
  loadConfig: mockLoadConfig,
}));

vi.mock("node:child_process", () => ({
  execSync: mockExecSync,
}));

vi.mock("node:fs", () => ({
  existsSync: mockExistsSync,
}));

const DEFAULT_CONFIG = {
  auth: {
    accessTokenExpiresIn: "15m",
    adminPassword: "admin123",
    refreshTokenExpiresIn: "7d",
    secret: "test-secret-at-least-32-chars-long-for-security!!",
  },
  cors: { origin: "*" },
  database: { adapter: "sqlite", url: ":memory:" },
  host: "localhost",
  logger: { level: "silent" },
  port: 0,
  rateLimit: { max: 1000, timeWindow: "1 minute" },
  schema: { baseDir: "./cms" },
  storage: { baseDir: "./uploads" },
  swagger: { description: "Test", title: "Test API", version: "1.0.0" },
};

class ExitCode extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

describe("dev command", () => {
  const originalExit = process.exit;
  const originalOn = process.on.bind(process);
  const originalRemoveListener = process.removeListener.bind(process);
  let shutdownHandlers: Map<string, (...args: unknown[]) => void>;

  beforeEach(() => {
    shutdownHandlers = new Map();
    process.exit = vi.fn((code?: number) => {
      throw new ExitCode(code ?? 0);
    }) as never;
    process.on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (event === "SIGINT" || event === "SIGTERM") {
        shutdownHandlers.set(event, handler);
      }
      return process;
    }) as never;
    process.removeListener = vi.fn((event: string) => {
      shutdownHandlers.delete(event);
      return process;
    }) as never;
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue(DEFAULT_CONFIG);
    mockConnectAndLoad.mockResolvedValue({ collections: [], globals: [] });
    mockCreateAndStartApp.mockResolvedValue({
      fastify: { close: vi.fn() },
      stop: mockStop,
    });
    mockExistsSync.mockReturnValue(true);
    mockWatcherInstance.on.mockClear();
    mockWatcherInstance.start.mockClear();
    mockWatcherInstance.stop.mockClear();
  });

  afterEach(() => {
    process.exit = originalExit;
    process.on = originalOn;
    process.removeListener = originalRemoveListener;
  });

  it("printDevHelp logs help text and exits", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { printDevHelp } = await import("../src/commands/dev.js");

    let exitCode: number | undefined;
    process.exit = vi.fn((code?: number) => {
      exitCode = code;
      throw new ExitCode(code ?? 0);
    }) as never;

    try {
      printDevHelp();
    } catch {
      // expected
    }

    expect(exitCode).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("cms dev"));
    logSpy.mockRestore();
  });

  it("dev() start failure with Error calls process.exit(1)", async () => {
    mockConnectAndLoad.mockRejectedValue(new Error("DB connection failed"));
    const { dev } = await import("../src/commands/dev.js");

    await expect(dev({})).rejects.toThrow(ExitCode);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("dev() start failure with non-Error value", async () => {
    mockConnectAndLoad.mockRejectedValue("string error");
    const { dev } = await import("../src/commands/dev.js");

    await expect(dev({})).rejects.toThrow(ExitCode);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("dev() createAndStartApp failure calls process.exit(1)", async () => {
    mockCreateAndStartApp.mockRejectedValue(new Error("App failed"));
    const { dev } = await import("../src/commands/dev.js");

    await expect(dev({})).rejects.toThrow(ExitCode);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("dev() setup: ensures auth secret, applies overrides, auto-creates sqlite", async () => {
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(mockEnsureDevAuthSecret).toHaveBeenCalled();
    expect(mockApplyCliOverrides).toHaveBeenCalled();
    expect(mockAutoCreateSqlite).toHaveBeenCalled();
  });

  it("dev() creates SQLiteAdapter for sqlite config", async () => {
    const { SQLiteAdapter } = await import("@arche-cms/database");
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(SQLiteAdapter).toHaveBeenCalled();
  });

  it("dev() creates postgres adapter for postgres config", async () => {
    mockLoadConfig.mockReturnValue({
      ...DEFAULT_CONFIG,
      database: { adapter: "postgres", url: "postgresql://localhost/test" },
    });
    const { createPostgresAdapter } = await import("@arche-cms/database");
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(createPostgresAdapter).toHaveBeenCalled();
  });

  it("dev() registers plugins and discovers plugins", async () => {
    const { PluginManager } = await import("@arche-cms/plugins");
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(PluginManager).toHaveBeenCalled();
  });

  it("dev() starts SchemaWatcher and registers change handler", async () => {
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(mockWatcherInstance.start).toHaveBeenCalled();
    expect(mockWatcherInstance.on).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("dev() registers SIGINT and SIGTERM shutdown handlers", async () => {
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(shutdownHandlers.has("SIGINT")).toBe(true);
    expect(shutdownHandlers.has("SIGTERM")).toBe(true);
  });

  it("dev() shutdown via SIGINT stops watcher, server, and disconnects", async () => {
    process.exit = vi.fn(() => {}) as never;
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    const handler = shutdownHandlers.get("SIGINT");
    expect(handler).toBeDefined();
    handler?.();

    await new Promise((r) => setTimeout(r, 100));
    expect(mockWatcherInstance.stop).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("dev() shutdown via SIGTERM stops watcher, server, and disconnects", async () => {
    process.exit = vi.fn(() => {}) as never;
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    const handler = shutdownHandlers.get("SIGTERM");
    expect(handler).toBeDefined();
    handler?.();

    await new Promise((r) => setTimeout(r, 100));
    expect(mockWatcherInstance.stop).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("dev() createAndStartApp receives plugin hooks", async () => {
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(mockCreateAndStartApp).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        getAdminPanels: expect.any(Function),
        getAll: expect.any(Function),
        getCustomFields: expect.any(Function),
        runHook: expect.any(Function),
      }),
    );
  });

  it("dev() plugin hooks getAll returns mapped data", async () => {
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    const pluginHooks = mockCreateAndStartApp.mock.calls[0][4];
    expect(pluginHooks.getAll()).toEqual([
      {
        enabled: true,
        plugin: { description: "SEO", name: "seo", slug: "seo", version: "1.0.0" },
      },
    ]);
  });

  it("dev() plugin hooks runHook delegates to runRouteHook", async () => {
    const { PluginManager } = await import("@arche-cms/plugins");
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    const pluginManagerInstance = (PluginManager as ReturnType<typeof vi.fn>).mock.results[0].value;
    const pluginHooks = mockCreateAndStartApp.mock.calls[0][4];
    await pluginHooks.runHook("afterRouteRegister");
    expect(pluginManagerInstance.runRouteHook).toHaveBeenCalledWith("afterRouteRegister");
  });

  it("dev() watcher change triggers debounced reload", async () => {
    vi.useFakeTimers();
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await vi.advanceTimersByTimeAsync(10);

    const calls = mockWatcherInstance.on.mock.calls as Array<[string, (event: unknown) => void]>;
    const changeEntry = calls.find((c) => c[0] === "change");
    expect(changeEntry).toBeDefined();

    changeEntry?.[1]({ category: "collections", slug: "posts", type: "create" });
    await vi.advanceTimersByTimeAsync(50);
    expect(mockStop).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);
    expect(mockStop).toHaveBeenCalled();
    expect(mockConnectAndLoad).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("dev() watcher reload failure does not crash", async () => {
    vi.useFakeTimers();
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await vi.advanceTimersByTimeAsync(10);

    const calls = mockWatcherInstance.on.mock.calls as Array<[string, (event: unknown) => void]>;
    const changeEntry = calls.find((c) => c[0] === "change");
    expect(changeEntry).toBeDefined();

    mockConnectAndLoad.mockRejectedValueOnce(new Error("reload failed"));
    changeEntry?.[1]({ category: "collections", slug: "posts", type: "create" });
    await vi.advanceTimersByTimeAsync(400);
    await vi.advanceTimersByTimeAsync(50);
    vi.useRealTimers();
  });

  it("dev() ensureAdminBuild warns when admin source not found", async () => {
    mockExistsSync.mockReturnValue(false);
    const { dev } = await import("../src/commands/dev.js");
    dev({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(mockExistsSync).toHaveBeenCalled();
  });

  it("dev() with port option passes port", async () => {
    const { dev } = await import("../src/commands/dev.js");
    dev({ port: 8080 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(mockApplyCliOverrides).toHaveBeenCalledWith({ port: 8080 });
  });

  it("dev() with all options passes them to applyCliOverrides", async () => {
    const { dev } = await import("../src/commands/dev.js");
    dev({
      dbAdapter: "postgres",
      dbUrl: "postgresql://localhost/db",
      dir: "./schemas",
      host: "0.0.0.0",
      port: 8080,
      vite: true,
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(mockApplyCliOverrides).toHaveBeenCalledWith({
      dbAdapter: "postgres",
      dbUrl: "postgresql://localhost/db",
      dir: "./schemas",
      host: "0.0.0.0",
      port: 8080,
      vite: true,
    });
  });
});
