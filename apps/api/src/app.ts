import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import type { DatabaseAdapter } from "@altrugenix/database";
import type { CollectionDefinition, GlobalDefinition } from "@altrugenix/types";
import type { StorageAdapter } from "@altrugenix/storage";
import type { ServerConfig } from "./config.js";
import { registerCors } from "./plugins/cors.js";
import { registerHealth } from "./plugins/health.js";
import { registerSwagger } from "./plugins/swagger.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerRequestLogger } from "./plugins/request-logger.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerGraphQL } from "./plugins/graphql.js";
import { registerAuth } from "./plugins/auth.js";
import { registerPermissions } from "./plugins/permissions.js";
import { registerCollectionRoutes, registerGlobalRoutes } from "./routes/collections.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerRoleRoutes } from "./routes/roles.js";
import { registerMediaRoutes } from "./routes/media.js";
import { registerSchemaRoutes } from "./routes/schemas.js";
import { registerActivityRoutes } from "./routes/activity.js";
import { ensureActivityTable } from "./lib/activity.js";

export interface AppOptions {
  config: ServerConfig;
  adapter: DatabaseAdapter;
  storageAdapter?: StorageAdapter;
  collections?: CollectionDefinition[];
  globals?: GlobalDefinition[];
  pluginManager?: {
    runHook(hookName: "beforeRouteRegister" | "afterRouteRegister"): Promise<void>;
    getCustomFields(): Record<string, unknown[]>;
    getAdminPanels(): Array<{
      slug: string;
      label: string;
      icon?: string;
      component: string;
      plugin: string;
    }>;
  };
}

export async function createApp(options: AppOptions): Promise<FastifyInstance> {
  const { config, adapter, collections, globals } = options;

  const fastify = Fastify({
    logger: {
      level: config.logger.level,
    },
  });

  await registerCors(fastify, config.cors.origin);
  await registerRateLimit(fastify, config.rateLimit);
  await registerSwagger(fastify, config.swagger);

  registerHealth(fastify, adapter);
  registerRequestLogger(fastify);
  registerErrorHandler(fastify);

  // Security headers
  fastify.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    reply.header("X-DNS-Prefetch-Control", "off");
    return payload;
  });

  await registerAuth(fastify, { adapter, config: config.auth });
  await registerPermissions(fastify, { adapter });
  registerUserRoutes(fastify, adapter, config.auth);
  registerRoleRoutes(fastify, adapter);
  registerActivityRoutes(fastify, adapter);
  await ensureActivityTable(adapter);

  if (options.storageAdapter) {
    registerMediaRoutes(fastify, adapter, options.storageAdapter);
  }

  await options.pluginManager?.runHook("beforeRouteRegister");

  if (collections && collections.length > 0) {
    registerCollectionRoutes(fastify, collections, adapter);
    await registerGraphQL(fastify, collections, adapter);
  }

  if (globals && globals.length > 0) {
    registerGlobalRoutes(fastify, globals, adapter);
  }

  await options.pluginManager?.runHook("afterRouteRegister");

  registerSchemaRoutes(fastify, config);

  // Pre-compute metadata for admin UI (avoids re-mapping on every request)
  const collectionMeta = (collections ?? []).map((c) => ({
    slug: c.slug,
    label: c.labels?.plural ?? c.slug,
    labels: c.labels,
    versions: c.versions,
    // fallow-ignore-next-line complexity
    fields: c.fields.map((f) => {
      const base = {
        name: f.name,
        type: f.type,
        label: f.label ?? f.name,
        required: f.validation?.required ?? false,
      };
      if (f.type === "relation") {
        return { ...base, to: (f as { to?: string }).to ?? "" };
      }
      if (f.type === "select" || f.type === "multiSelect" || f.type === "radio") {
        const opts = (f as { options?: Array<{ label: string; value: string }> }).options ?? [];
        return { ...base, options: opts.map((o) => o.value) };
      }
      return base;
    }),
  }));

  const globalMeta = (globals ?? []).map((g) => ({
    slug: g.slug,
    label: g.label,
    // fallow-ignore-next-line complexity
    fields: g.fields.map((f) => {
      const base = {
        name: f.name,
        type: f.type,
        label: f.label ?? f.name,
        required: f.validation?.required ?? false,
      };
      if (f.type === "relation") {
        return { ...base, to: (f as { to?: string }).to ?? "" };
      }
      if (f.type === "select" || f.type === "multiSelect" || f.type === "radio") {
        const opts = (f as { options?: Array<{ label: string; value: string }> }).options ?? [];
        return { ...base, options: opts.map((o) => o.value) };
      }
      return base;
    }),
  }));

  fastify.get("/api/collections", async () => collectionMeta);
  fastify.get("/api/globals", async () => globalMeta);

  return fastify;
}
