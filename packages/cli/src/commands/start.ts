/* eslint-disable no-console */

import { SQLiteAdapter, PostgresAdapter } from "@altrugenix/database";
import { PluginManager, seoPlugin, discoverPlugins } from "@altrugenix/plugins";
import { EventBus, Lifecycle, createLogger } from "@altrugenix/core";
import { loadConfig } from "../server/config.js";
import {
  applyCliOverrides,
  autoCreateSqlite,
  connectAndLoad,
  createAndStartApp,
} from "../server/bootstrap.js";

export interface StartOptions {
  dir?: string;
  port?: number;
  host?: string;
  dbUrl?: string;
  dbAdapter?: string;
}

export function printStartHelp(): void {
  console.log(`
Usage: cms start [options]

Start the CMS production server (no file watching).

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

export async function start(options: StartOptions): Promise<void> {
  const logger = createLogger({ level: "info", prefix: "cms" });

  applyCliOverrides(options);

  const config = loadConfig();

  autoCreateSqlite(config, logger);

  const adapter =
    config.database.adapter === "postgres"
      ? new PostgresAdapter({ connectionString: config.database.url })
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

  try {
    const { collections, globals } = await connectAndLoad(config, adapter);
    logger.info(`Loaded ${collections.length} collection(s), ${globals.length} global(s)`);

    const server = await createAndStartApp(config, adapter, collections, globals, pluginHooks);

    process.on("SIGINT", async () => {
      logger.info("Shutting down...");
      await server.stop();
      await adapter.disconnect();
      process.exit(0);
    });

    await new Promise(() => {});
  } catch (err) {
    logger.error("Failed to start server:", err instanceof Error ? err.message : String(err));
    await adapter.disconnect().catch(() => {});
    process.exit(1);
  }
}
