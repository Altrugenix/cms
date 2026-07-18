import type { DatabaseAdapter } from "@arche-cms/database";
import type { StorageAdapter } from "@arche-cms/storage";
import type { CollectionDefinition, GlobalDefinition } from "@arche-cms/types";
import type { FastifyInstance } from "fastify";

import Fastify from "fastify";

import type { ServerConfig } from "./config.js";

import { ensureActivityTable } from "./lib/activity.js";
import { registerAuth } from "./plugins/auth.js";
import { registerCors } from "./plugins/cors.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerGraphQL } from "./plugins/graphql.js";
import { registerHealth } from "./plugins/health.js";
import { registerPermissions } from "./plugins/permissions.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerRequestLogger } from "./plugins/request-logger.js";
import { registerSwagger } from "./plugins/swagger.js";
import { registerActivityRoutes } from "./routes/activity.js";
import { registerApiTokenRoutes } from "./routes/api-tokens.js";
import { registerCollectionRoutes, registerGlobalRoutes } from "./routes/collections.js";
import { registerMediaRoutes } from "./routes/media.js";
import { registerRoleRoutes } from "./routes/roles.js";
import { registerSchemaRoutes } from "./routes/schemas.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";

function normalizeOptions(opts: unknown[]): string[] {
  return opts.map((o) => {
    if (typeof o === "string") return o;
    if (o && typeof o === "object" && "value" in o) return String((o as { value: string }).value);
    return String(o);
  });
}

export interface AppOptions {
  config: ServerConfig;
  adapter: DatabaseAdapter;
  storageAdapter?: StorageAdapter | undefined;
  collections?: CollectionDefinition[] | undefined;
  globals?: GlobalDefinition[] | undefined;
  pluginManager?:
    | {
        runHook(hookName: "beforeRouteRegister" | "afterRouteRegister"): Promise<void>;
        getCustomFields(): Record<string, unknown[]>;
        getAdminPanels(): Array<{
          slug: string;
          label: string;
          icon?: string | undefined;
          component: string;
          plugin: string;
        }>;
        getAll(): Array<{
          plugin: {
            slug: string;
            name: string;
            description?: string | undefined;
            version?: string | undefined;
          };
          enabled: boolean;
        }>;
      }
    | undefined;
}

export async function createApp(options: AppOptions): Promise<FastifyInstance> {
  const { adapter, collections, config, globals } = options;

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
  registerApiTokenRoutes(fastify, adapter);
  registerWebhookRoutes(fastify, adapter);
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

  let collectionMeta: Record<string, unknown>[] = (collections ?? []).map((c) => ({
    // fallow-ignore-next-line complexity
    fields: (c.fields ?? []).map((f) => {
      const base = {
        label: f.label ?? f.name,
        name: f.name,
        required: f.validation?.required ?? false,
        type: f.type,
      };
      if (f.type === "relation") {
        return { ...base, to: (f as { to?: string }).to ?? "" };
      }
      if (f.type === "select" || f.type === "multiSelect" || f.type === "radio") {
        const opts = (f as { options?: unknown[] }).options ?? [];
        return { ...base, options: normalizeOptions(opts) };
      }
      return base;
    }),
    label: c.labels?.plural ?? c.slug,
    labels: c.labels,
    slug: c.slug,
    versions: c.versions,
  }));

  let globalMeta: Record<string, unknown>[] = (globals ?? []).map((g) => ({
    // fallow-ignore-next-line complexity
    fields: (g.fields ?? []).map((f) => {
      const base = {
        label: f.label ?? f.name,
        name: f.name,
        required: f.validation?.required ?? false,
        type: f.type,
      };
      if (f.type === "relation") {
        return { ...base, to: (f as { to?: string }).to ?? "" };
      }
      if (f.type === "select" || f.type === "multiSelect" || f.type === "radio") {
        const opts = (f as { options?: unknown[] }).options ?? [];
        return { ...base, options: normalizeOptions(opts) };
      }
      return base;
    }),
    label: g.label,
    slug: g.slug,
  }));

  registerSchemaRoutes(fastify, config, adapter, (newCollections, newGlobals) => {
    collectionMeta = newCollections;
    globalMeta = newGlobals;
  });

  fastify.get(
    "/api/collections",
    {
      schema: {
        description: "Returns metadata about all registered collections",
        response: {
          "2xx": {
            items: { additionalProperties: true, type: "object" },
            type: "array",
          },
        },
        security: [],
        summary: "List collections",
        tags: ["Collections"],
      },
    },
    async () => collectionMeta,
  );

  fastify.get(
    "/api/globals",
    {
      schema: {
        description: "Returns metadata about all registered globals",
        response: {
          "2xx": {
            items: { additionalProperties: true, type: "object" },
            type: "array",
          },
        },
        security: [],
        summary: "List globals",
        tags: ["Globals"],
      },
    },
    async () => globalMeta,
  );

  fastify.get(
    "/api/plugins",
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: "Returns all registered plugins and their status",
        response: {
          "2xx": {
            properties: {
              data: { items: { type: "object" }, type: "array" },
              total: { type: "number" },
            },
            required: ["data", "total"],
            type: "object",
          },
        },
        summary: "List plugins",
        tags: ["System"],
      },
    },
    async () => {
      const plugins = options.pluginManager?.getAll() ?? [];
      return { data: plugins, total: plugins.length };
    },
  );

  return fastify;
}
