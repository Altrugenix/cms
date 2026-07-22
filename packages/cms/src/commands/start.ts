/* eslint-disable no-console */

import { EventBus, Lifecycle, createLogger } from "@arche-cms/core";
import { SQLiteAdapter, createPostgresAdapter } from "@arche-cms/database";
import { PluginManager, seoPlugin, discoverPlugins } from "@arche-cms/plugins";

import {
  applyCliOverrides,
  autoCreateSqlite,
  connectAndLoad,
  createAndStartApp,
} from "../server/bootstrap.js";
import { loadConfig } from "../server/config.js";

export interface StartOptions {
  dir?: string | undefined;
  port?: number | undefined;
  host?: string | undefined;
  dbUrl?: string | undefined;
  dbAdapter?: string | undefined;
}

export function printStartHelp(): void {
  console.log(`
Usage: cms start [options]

Start the CMS production server (no file watching).

Options:
  --dir <path>       Schema directory (default: ./cms)
  --port <num>       Server port (default: 3500)
  --host <addr>      Server host (default: 0.0.0.0)
  --db-url <url>     Database URL (default: file:./cms.db)
  --db-adapter <type> Database adapter: sqlite | postgres (default: sqlite)
  --help             Show this help
`);
  process.exit(0);
}

export async function start(options: StartOptions): Promise<void> {
  const logger = createLogger({ level: "info", prefix: "cms" });

  applyCliOverrides(options);

  const config = loadConfig();

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
    /* v8 ignore next -- called by server when admin panel is requested */
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
    /* v8 ignore next -- called by server when custom fields are requested */
    getCustomFields: () => pluginManager.getCustomFields(),
    runHook: (name: "beforeRouteRegister" | "afterRouteRegister") =>
      pluginManager.runRouteHook(name),
  };

  try {
    const { collections, globals } = await connectAndLoad(config, adapter, logger);
    logger.info(`Loaded ${collections.length} collection(s), ${globals.length} global(s)`);

    const server = await createAndStartApp(config, adapter, collections, globals, pluginHooks);

    const shutdown = () => {
      void (async () => {
        logger.info("Shutting down...");
        await server.stop();
        await adapter.disconnect();
        process.exit(0);
      })();
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    /* v8 ignore start — blocks forever until SIGINT/SIGTERM */
    await new Promise(() => {});
    /* v8 ignore stop */
  } catch (err) {
    logger.error("Failed to start server:", err instanceof Error ? err.message : String(err));
    await adapter.disconnect().catch(() => {});
    process.exit(1);
  }
}
