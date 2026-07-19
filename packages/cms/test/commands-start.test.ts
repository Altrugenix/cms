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
const mockApplyCliOverrides = vi.fn();
const mockAutoCreateSqlite = vi.fn();
const mockLoadConfig = vi.fn();

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

vi.mock("../src/server/bootstrap.js", () => ({
  applyCliOverrides: mockApplyCliOverrides,
  autoCreateSqlite: mockAutoCreateSqlite,
  connectAndLoad: mockConnectAndLoad,
  createAndStartApp: mockCreateAndStartApp,
}));

vi.mock("../src/server/config.js", () => ({
  loadConfig: mockLoadConfig,
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

describe("start command", () => {
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
  });

  afterEach(() => {
    process.exit = originalExit;
    process.on = originalOn;
    process.removeListener = originalRemoveListener;
  });

  it("printStartHelp logs help text and exits", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { printStartHelp } = await import("../src/commands/start.js");

    let exitCode: number | undefined;
    process.exit = vi.fn((code?: number) => {
      exitCode = code;
      throw new ExitCode(code ?? 0);
    }) as never;

    try {
      printStartHelp();
    } catch {
      // expected
    }

    expect(exitCode).toBe(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("cms start"));
    logSpy.mockRestore();
  });

  it("start() connectAndLoad failure calls process.exit(1)", async () => {
    mockConnectAndLoad.mockRejectedValue(new Error("DB error"));
    const { start } = await import("../src/commands/start.js");

    await expect(start({})).rejects.toThrow(ExitCode);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("start() createAndStartApp failure calls process.exit(1)", async () => {
    mockCreateAndStartApp.mockRejectedValue(new Error("App failed"));
    const { start } = await import("../src/commands/start.js");

    await expect(start({})).rejects.toThrow(ExitCode);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("start() failure with non-Error value", async () => {
    mockConnectAndLoad.mockRejectedValue("string error");
    const { start } = await import("../src/commands/start.js");

    await expect(start({})).rejects.toThrow(ExitCode);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("start() applies CLI overrides and auto-creates sqlite", async () => {
    const { start } = await import("../src/commands/start.js");
    start({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(mockApplyCliOverrides).toHaveBeenCalled();
    expect(mockAutoCreateSqlite).toHaveBeenCalled();
  });

  it("start() creates SQLiteAdapter for sqlite config", async () => {
    const { SQLiteAdapter } = await import("@arche-cms/database");
    const { start } = await import("../src/commands/start.js");
    start({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(SQLiteAdapter).toHaveBeenCalled();
  });

  it("start() creates postgres adapter for postgres config", async () => {
    mockLoadConfig.mockReturnValue({
      ...DEFAULT_CONFIG,
      database: { adapter: "postgres", url: "postgresql://localhost/test" },
    });
    const { createPostgresAdapter } = await import("@arche-cms/database");
    const { start } = await import("../src/commands/start.js");
    start({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(createPostgresAdapter).toHaveBeenCalled();
  });

  it("start() registers plugins", async () => {
    const { PluginManager } = await import("@arche-cms/plugins");
    const { start } = await import("../src/commands/start.js");
    start({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(PluginManager).toHaveBeenCalled();
  });

  it("start() registers SIGINT and SIGTERM shutdown handlers", async () => {
    const { start } = await import("../src/commands/start.js");
    start({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(shutdownHandlers.has("SIGINT")).toBe(true);
    expect(shutdownHandlers.has("SIGTERM")).toBe(true);
  });

  it("start() shutdown via SIGINT stops server and disconnects", async () => {
    process.exit = vi.fn(() => {}) as never;
    const { start } = await import("../src/commands/start.js");
    start({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    const handler = shutdownHandlers.get("SIGINT");
    expect(handler).toBeDefined();
    handler?.();

    await new Promise((r) => setTimeout(r, 100));
    expect(mockStop).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("start() shutdown via SIGTERM stops server and disconnects", async () => {
    process.exit = vi.fn(() => {}) as never;
    const { start } = await import("../src/commands/start.js");
    start({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    const handler = shutdownHandlers.get("SIGTERM");
    expect(handler).toBeDefined();
    handler?.();

    await new Promise((r) => setTimeout(r, 100));
    expect(mockStop).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("start() passes options to applyCliOverrides", async () => {
    const { start } = await import("../src/commands/start.js");
    start({
      dbAdapter: "postgres",
      dbUrl: "postgresql://localhost/db",
      dir: "./schemas",
      host: "0.0.0.0",
      port: 8080,
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    expect(mockApplyCliOverrides).toHaveBeenCalledWith({
      dbAdapter: "postgres",
      dbUrl: "postgresql://localhost/db",
      dir: "./schemas",
      host: "0.0.0.0",
      port: 8080,
    });
  });

  it("start() passes plugin hooks to createAndStartApp", async () => {
    const { start } = await import("../src/commands/start.js");
    start({}).catch(() => {});
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

  it("start() plugin hooks getAll returns mapped data", async () => {
    const { start } = await import("../src/commands/start.js");
    start({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    const pluginHooks = mockCreateAndStartApp.mock.calls[0][4];
    expect(pluginHooks.getAll()).toEqual([
      {
        enabled: true,
        plugin: { description: "SEO", name: "seo", slug: "seo", version: "1.0.0" },
      },
    ]);
  });

  it("start() plugin hooks runHook delegates to runRouteHook", async () => {
    const { PluginManager } = await import("@arche-cms/plugins");
    const { start } = await import("../src/commands/start.js");
    start({}).catch(() => {});
    await new Promise((r) => setTimeout(r, 10));

    const pluginManagerInstance = (PluginManager as ReturnType<typeof vi.fn>).mock.results[0].value;
    const pluginHooks = mockCreateAndStartApp.mock.calls[0][4];
    await pluginHooks.runHook("afterRouteRegister");
    expect(pluginManagerInstance.runRouteHook).toHaveBeenCalledWith("afterRouteRegister");
  });
});
