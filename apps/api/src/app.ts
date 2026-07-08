import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { DatabaseAdapter } from "@altrugenix/database";
import type { CollectionDefinition } from "@altrugenix/types";
import type { ServerConfig } from "./config.js";
import { registerCors } from "./plugins/cors.js";
import { registerHealth } from "./plugins/health.js";
import { registerSwagger } from "./plugins/swagger.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerRequestLogger } from "./plugins/request-logger.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerGraphQL } from "./plugins/graphql.js";
import { registerAuth } from "./plugins/auth.js";
import { registerCollectionRoutes } from "./routes/collections.js";

export interface AppOptions {
  config: ServerConfig;
  adapter: DatabaseAdapter;
  collections?: CollectionDefinition[];
}

export async function createApp(options: AppOptions): Promise<FastifyInstance> {
  const { config, adapter, collections } = options;

  const fastify = Fastify({
    logger: {
      level: config.logger.level,
    },
  });

  await registerCors(fastify, config.cors.origin);
  await registerRateLimit(fastify, config.rateLimit);
  await registerSwagger(fastify, config.swagger);

  registerHealth(fastify);
  registerRequestLogger(fastify);
  registerErrorHandler(fastify);

  await registerAuth(fastify, { adapter, config: config.auth });

  if (collections && collections.length > 0) {
    registerCollectionRoutes(fastify, collections, adapter);
    await registerGraphQL(fastify, collections, adapter);
  }

  return fastify;
}
