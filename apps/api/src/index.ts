/* eslint-disable no-console */

import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { SchemaLoader } from "@altrugenix/schema";
import { SQLiteAdapter } from "@altrugenix/database";
import { LocalStorageAdapter } from "@altrugenix/storage";
import { PluginManager, seoPlugin } from "@altrugenix/plugins";
import { discoverPlugins } from "@altrugenix/plugins";
import { EventBus, Lifecycle, createLogger } from "@altrugenix/core";
import { createScheduledPublisher } from "./services/scheduled-publisher.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const adapter = new SQLiteAdapter(config.database.url);
  const eventBus = new EventBus();
  const lifecycle = new Lifecycle();
  const logger = createLogger({
    level: config.logger.level as "info" | "error" | "fatal" | "warn" | "debug",
  });

  const pluginManager = new PluginManager({
    eventBus,
    lifecycle,
    context: {
      config: config as never,
      logger,
      container: {},
    },
  });

  pluginManager.register(seoPlugin);

  const discovered = await discoverPlugins();
  for (const plugin of discovered) {
    pluginManager.register(plugin.definition);
  }

  const schemaLoader = new SchemaLoader({
    baseDir: config.schema.baseDir,
    onBeforeLoad: () => pluginManager.runHook("beforeSchemaLoad"),
    onAfterLoad: async () => {
      await pluginManager.runHook("afterSchemaLoad");
    },
  });

  try {
    await adapter.connect();
    await adapter.raw("SELECT 1");
    console.log("Database connection verified");
    const schemas = await schemaLoader.load();
    const collections = Array.from(schemas.collections.values());
    const globals = Array.from(schemas.globals.values());
    const storageAdapter = new LocalStorageAdapter(config.storage.baseDir);
    const fastify = await createApp({
      config,
      adapter,
      storageAdapter,
      collections,
      globals,
      pluginManager: {
        runHook: (name) => pluginManager.runRouteHook(name),
        getCustomFields: () => pluginManager.getCustomFields(),
        getAdminPanels: () => pluginManager.getAdminPanels(),
      },
    });

    const publisher = createScheduledPublisher(adapter, collections);
    fastify.addHook("onClose", () => publisher.stop());

    await fastify.listen({ port: config.port, host: config.host });
    console.log(`Server listening on http://${config.host}:${config.port}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    await adapter.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();
