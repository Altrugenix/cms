/* eslint-disable no-console */

import type { SchemaChangeEvent } from "@arche-cms/schema";
import type { ViteDevServer } from "vite";

import { EventBus, Lifecycle, createLogger } from "@arche-cms/core";
import { SQLiteAdapter, createPostgresAdapter } from "@arche-cms/database";
import { PluginManager, seoPlugin, discoverPlugins } from "@arche-cms/plugins";
import { SchemaWatcher } from "@arche-cms/schema";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { ServerInstance } from "../server/bootstrap.js";

import {
  ensureDevAuthSecret,
  applyCliOverrides,
  autoCreateSqlite,
  connectAndLoad,
  createAndStartApp,
} from "../server/bootstrap.js";
import { loadConfig } from "../server/config.js";

const RELOAD_DEBOUNCE_MS = 300;

export interface DevOptions {
  dir?: string | undefined;
  port?: number | undefined;
  host?: string | undefined;
  dbUrl?: string | undefined;
  dbAdapter?: string | undefined;
  vite?: boolean | undefined;
}

async function startViteDevServer(
  port: number,
  logger: ReturnType<typeof createLogger>,
): Promise<ViteDevServer> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const adminDir = resolve(currentDir, "../../src/admin");

  const { createServer } = await import("vite");

  logger.info(`Starting Vite dev server for admin panel...`);
  const server = await createServer({
    configFile: resolve(adminDir, "vite.config.ts"),
    define: { "import.meta.env.VITE_API_URL": '""' },
    root: adminDir,
    server: {
      port: 5173,
      proxy: {
        "/api": `http://localhost:${port}`,
        "/docs": `http://localhost:${port}`,
        "/graphiql": `http://localhost:${port}`,
        "/graphql": `http://localhost:${port}`,
        "/health": `http://localhost:${port}`,
      },
    },
  });

  await server.listen();
  return server;
}

export function printDevHelp(): void {
  console.log(`
Usage: cms dev [options]

Start the CMS development server with file watching and hot-reload.

Options:
  --dir <path>       Schema directory (default: ./cms)
  --port <num>       Server port (default: 3500)
  --host <addr>      Server host (default: 0.0.0.0)
  --db-url <url>     Database URL (default: file:./cms.db)
  --db-adapter <type> Database adapter: sqlite | postgres (default: sqlite)
  --vite             Start Vite dev server for admin HMR (default: false)
  --help             Show this help
`);
  process.exit(0);
}

function ensureAdminBuild(logger: ReturnType<typeof createLogger>): void {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const bundledAdmin = resolve(currentDir, "../admin");

  if (existsSync(bundledAdmin) && existsSync(resolve(bundledAdmin, "index.html"))) return;

  const adminSource = resolve(currentDir, "../../src/admin");
  if (existsSync(adminSource)) {
    logger.info("Admin panel build not found — building from source...");
    try {
      execSync("pnpm build:admin", {
        cwd: resolve(currentDir, "../.."),
        env: { ...process.env, NODE_ENV: "production" },
        stdio: "inherit",
      });
      logger.info("Admin panel built at " + bundledAdmin);
    } catch {
      logger.warn("Admin panel build failed — admin UI will not be available");
    }
  } else {
    logger.warn("Admin panel source not found at " + adminSource);
  }
}

export async function dev(options: DevOptions): Promise<void> {
  const logger = createLogger({ level: "info", prefix: "cms" });

  ensureDevAuthSecret(logger);
  applyCliOverrides(options);

  let viteServer: ViteDevServer | null = null;

  if (options.vite) {
    viteServer = await startViteDevServer(options.port ?? 3500, logger);
    logger.info(`Admin dev server at http://localhost:5173`);
  } else {
    ensureAdminBuild(logger);
  }

  const config = loadConfig();
  const schemaDir = config.schema.baseDir;

  autoCreateSqlite(config, logger);

  const adapter =
    config.database.adapter === "postgres"
      ? await createPostgresAdapter({ connectionString: config.database.url })
      : new SQLiteAdapter(config.database.url);

  const eventBus = new EventBus();
  const lifecycle = new Lifecycle();
  const pluginManager = new PluginManager({
    context: { config: config as never, container: {}, logger },
    eventBus,
    lifecycle,
  });

  pluginManager.register(seoPlugin);
  const discovered = await discoverPlugins();
  for (const plugin of discovered) {
    pluginManager.register(plugin.definition);
  }

  const pluginHooks = {
    getAdminPanels: () => pluginManager.getAdminPanels(),
    getAll: () =>
      pluginManager.getAll().map((r) => ({
        enabled: r.enabled,
        plugin: {
          description: r.plugin.description,
          name: r.plugin.name,
          slug: r.plugin.slug,
          version: r.plugin.version,
        },
      })),
    getCustomFields: () => pluginManager.getCustomFields(),
    runHook: (name: "beforeRouteRegister" | "afterRouteRegister") =>
      pluginManager.runRouteHook(name),
  };

  let currentServer: ServerInstance | null = null;

  async function start(): Promise<void> {
    try {
      const { collections, globals } = await connectAndLoad(config, adapter, logger);

      logger.info(`Loaded ${collections.length} collection(s), ${globals.length} global(s)`);

      currentServer = await createAndStartApp(config, adapter, collections, globals, pluginHooks);

      logger.info(`Watching for schema changes in ${schemaDir}/...`);
    } catch (err) {
      logger.error("Failed to start server:", err instanceof Error ? err.message : String(err));
      await adapter.disconnect().catch(() => {});
      process.exit(1);
    }
  }

  // Hot-reload: debounce schema changes, close old server, start new one
  let reloadTimer: ReturnType<typeof setTimeout> | null = null;

  async function handleSchemaChange(event: SchemaChangeEvent): Promise<void> {
    logger.info(`Schema changed: ${event.type} ${event.category}/${event.slug}`);

    if (reloadTimer) clearTimeout(reloadTimer);

    reloadTimer = setTimeout(() => {
      reloadTimer = null;
      logger.info("Reloading schemas and restarting server...");

      void (async () => {
        try {
          if (currentServer) {
            await currentServer.stop();
          }

          const { collections, globals } = await connectAndLoad(config, adapter, logger);

          logger.info(`Reloaded ${collections.length} collection(s), ${globals.length} global(s)`);

          currentServer = await createAndStartApp(
            config,
            adapter,
            collections,
            globals,
            pluginHooks,
          );

          logger.info("Server restarted successfully");
        } catch (err) {
          logger.error("Failed to reload:", err instanceof Error ? err.message : String(err));
        }
      })();
    }, RELOAD_DEBOUNCE_MS);
  }

  await start();

  // File watching with hot-reload
  const watcher = new SchemaWatcher(schemaDir);
  watcher.on("change", (event: SchemaChangeEvent) => {
    void handleSchemaChange(event);
  });
  await watcher.start();

  const shutdown = () => {
    void (async () => {
      logger.info("Shutting down...");
      await watcher.stop();
      if (currentServer) await currentServer.stop();
      if (viteServer) await viteServer.close();
      await adapter.disconnect();
      process.exit(0);
    })();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await new Promise(() => {});
}
