import { existsSync, writeFileSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import { SchemaLoader } from "@arche-cms/schema";
import { MigrationGenerator, MigrationRunner } from "@arche-cms/database";
import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition, GlobalDefinition } from "@arche-cms/types";
import { LocalStorageAdapter } from "@arche-cms/storage";
import { createLogger } from "@arche-cms/core";
import type { Logger } from "@arche-cms/types";
import type { ServerConfig } from "./config.js";
import { createApp } from "./app.js";
import { createScheduledPublisher } from "./services/scheduled-publisher.js";
import { registerAdminStatic } from "./plugins/static.js";

export interface PluginHooks {
  runHook(name: "beforeRouteRegister" | "afterRouteRegister"): Promise<void>;
  getCustomFields(): Record<string, unknown[]>;
  getAdminPanels(): Array<{
    slug: string;
    label: string;
    icon?: string;
    component: string;
    plugin: string;
  }>;
}

export interface ServerInstance {
  fastify: FastifyInstance;
  stop: () => Promise<void>;
}

export function resolveDbPath(dbUrl: string): string {
  if (dbUrl.startsWith("file:")) {
    const path = dbUrl.slice(5);
    return path || ":memory:";
  }
  return dbUrl;
}

export function autoCreateSqlite(config: ServerConfig, logger: Logger): void {
  if (config.database.adapter === "sqlite") {
    const dbPath = resolveDbPath(config.database.url);
    if (dbPath !== ":memory:" && !existsSync(dbPath)) {
      logger.info(`Creating SQLite database at ${dbPath}`);
      writeFileSync(dbPath, "");
    }
  }
}

export function ensureDevAuthSecret(logger: Logger): void {
  if (!process.env.AUTH_SECRET) {
    logger.warn(
      "AUTH_SECRET not set \u2014 using ephemeral dev secret. Generate one with: openssl rand -hex 32",
    );
    process.env.AUTH_SECRET = "dev-secret-do-not-use-in-production";
  }
}

export function applyCliOverrides(options: {
  port?: number;
  host?: string;
  dir?: string;
  dbUrl?: string;
  dbAdapter?: string;
}): void {
  if (options.port) process.env.PORT = String(options.port);
  if (options.host) process.env.HOST = options.host;
  if (options.dir) process.env.SCHEMA_DIR = options.dir;
  if (options.dbUrl) process.env.DB_URL = options.dbUrl;
  if (options.dbAdapter) process.env.DB_ADAPTER = options.dbAdapter;
}

export async function connectAndLoad(
  config: ServerConfig,
  adapter: DatabaseAdapter,
  logger?: Logger,
): Promise<{ collections: CollectionDefinition[]; globals: GlobalDefinition[] }> {
  await adapter.connect();
  await adapter.raw("SELECT 1");

  const schemaLoader = new SchemaLoader({ baseDir: config.schema.baseDir });
  const schemas = await schemaLoader.load();
  const collections = Array.from(schemas.collections.values());
  const globals = Array.from(schemas.globals.values());

  const existingSchema = await adapter.getExistingSchema();
  const generator = new MigrationGenerator();
  const migrations = generator.generate(collections, existingSchema, globals);
  if (migrations.length > 0) {
    const runner = new MigrationRunner(adapter);
    await runner.run(migrations);
    (logger ?? console).info(`Applied ${migrations.length} auto-migration(s)`);
  }

  return { collections, globals };
}

export async function createAndStartApp(
  config: ServerConfig,
  adapter: DatabaseAdapter,
  collections: Parameters<typeof createApp>[0]["collections"],
  globals: Parameters<typeof createApp>[0]["globals"],
  pluginManager?: PluginHooks,
): Promise<ServerInstance> {
  const logger = createLogger({
    level: config.logger.level as "debug" | "info" | "warn" | "error" | "fatal",
    prefix: "cms",
  });

  const storageAdapter = new LocalStorageAdapter(process.env.STORAGE_DIR ?? "./uploads");

  const fastify = await createApp({
    config,
    adapter,
    storageAdapter,
    collections,
    globals,
    pluginManager,
  });

  const publisher = createScheduledPublisher(adapter, collections ?? []);
  fastify.addHook("onClose", () => publisher.stop());

  await registerAdminStatic(fastify, {});

  await fastify.listen({ port: config.port, host: config.host });
  logger.info(`Server listening on http://${config.host}:${config.port}`);
  logger.info(`API docs at http://localhost:${config.port}/docs`);

  return {
    fastify,
    stop: async () => {
      await fastify.close();
    },
  };
}
