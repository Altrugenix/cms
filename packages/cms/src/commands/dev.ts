/* eslint-disable no-console */

import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SchemaWatcher } from "@arche-cms/schema";
import type { SchemaChangeEvent } from "@arche-cms/schema";
import { SQLiteAdapter, createPostgresAdapter } from "@arche-cms/database";
import { PluginManager, seoPlugin, discoverPlugins } from "@arche-cms/plugins";
import { EventBus, Lifecycle, createLogger } from "@arche-cms/core";
import { loadConfig } from "../server/config.js";
import {
  ensureDevAuthSecret,
  applyCliOverrides,
  autoCreateSqlite,
  connectAndLoad,
  createAndStartApp,
} from "../server/bootstrap.js";
import type { ServerInstance } from "../server/bootstrap.js";

const RELOAD_DEBOUNCE_MS = 300;

export interface DevOptions {
  dir?: string;
  port?: number;
  host?: string;
  dbUrl?: string;
  dbAdapter?: string;
}

export function printDevHelp(): void {
  console.log(`
Usage: cms dev [options]

Start the CMS development server with file watching and hot-reload.

Options:
  --dir <path>       Schema directory (default: ./cms)
  --port <num>       Server port (default: 3000)
  --host <addr>      Server host (default: 0.0.0.0)
  --db-url <url>     Database URL (default: file:./cms.db)
  --db-adapter <type> Database adapter: sqlite | postgres (default: sqlite)
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
        stdio: "inherit",
        env: { ...process.env, NODE_ENV: "production" },
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
  ensureAdminBuild(logger);

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
    eventBus,
    lifecycle,
    context: { config: config as never, logger, container: {} },
  });

  pluginManager.register(seoPlugin);
  const discovered = await discoverPlugins();
  for (const plugin of discovered) {
    pluginManager.register(plugin.definition);
  }

  const pluginHooks = {
    runHook: (name: "beforeRouteRegister" | "afterRouteRegister") =>
      pluginManager.runRouteHook(name),
    getCustomFields: () => pluginManager.getCustomFields(),
    getAdminPanels: () => pluginManager.getAdminPanels(),
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

    reloadTimer = setTimeout(async () => {
      reloadTimer = null;
      logger.info("Reloading schemas and restarting server...");

      try {
        if (currentServer) {
          await currentServer.stop();
        }

        const { collections, globals } = await connectAndLoad(config, adapter, logger);

        logger.info(`Reloaded ${collections.length} collection(s), ${globals.length} global(s)`);

        currentServer = await createAndStartApp(config, adapter, collections, globals, pluginHooks);

        logger.info("Server restarted successfully");
      } catch (err) {
        logger.error("Failed to reload:", err instanceof Error ? err.message : String(err));
      }
    }, RELOAD_DEBOUNCE_MS);
  }

  await start();

  // File watching with hot-reload
  const watcher = new SchemaWatcher(schemaDir);
  watcher.on("change", handleSchemaChange);
  await watcher.start();

  process.on("SIGINT", async () => {
    logger.info("Shutting down...");
    await watcher.stop();
    if (currentServer) await currentServer.stop();
    await adapter.disconnect();
    process.exit(0);
  });

  await new Promise(() => {});
}
