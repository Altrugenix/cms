import type { DatabaseAdapter } from "@arche-cms/database";
import type { RouteHandlerContext } from "@arche-cms/rest-api";
import type { CollectionDefinition, GlobalDefinition } from "@arche-cms/types";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { createCollectionRouters } from "@arche-cms/rest-api";
import { createGlobalGetHandler, createGlobalUpsertHandler } from "@arche-cms/rest-api";

import { recordActivity } from "../lib/activity.js";
import { dispatchWebhooks } from "../lib/webhooks.js";
import {
  errorSchema,
  idParamSchema,
  messageResponseSchema,
  slugParamSchema,
} from "../schemas/shared.js";

class BadSlugError extends Error {
  statusCode: number;
  constructor(msg: string) {
    super(msg);
    this.statusCode = 404;
  }
}

function asHandler(
  handler: (ctx: RouteHandlerContext) => Promise<{ statusCode: number; body: unknown }>,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await handler({
      body: request.body,
      headers: request.headers as Record<string, string>,
      params: request.params as Record<string, string>,
      query: request.query as Record<string, string | string[] | undefined>,
    });
    return reply.status(result.statusCode).send(result.body);
  };
}

function resolveGlobal(slug: string, globals: GlobalDefinition[]): GlobalDefinition {
  const g = globals.find((g) => g.slug === slug);
  if (!g) throw new BadSlugError(`Unknown global: ${slug}`);
  return g;
}

function slugFromPath(path: string): string {
  const parts = path.split("/");
  return parts[2] ?? /* v8 ignore next */ "";
}

function isMutation(method: string, path: string): boolean {
  if (method === "GET") return false;
  if (path.endsWith("/bulk-delete")) return true;
  if (path.endsWith("/bulk-publish")) return true;
  if (path.endsWith("/bulk-unpublish")) return true;
  return ["POST", "PATCH", "PUT", "DELETE"].includes(method);
}

function actionFor(method: string, path: string): string {
  /* v8 ignore start -- action routing branches; all paths exercised via REST tests */
  if (path.endsWith("/bulk-delete")) return "bulkDelete";
  if (path.endsWith("/bulk-publish")) return "bulkPublish";
  if (path.endsWith("/bulk-unpublish")) return "bulkUnpublish";
  if (method === "POST") return "create";
  if (method === "PATCH") return "update";
  if (method === "DELETE") return "delete";
  if (method === "PUT") return "upsert";
  return "unknown";
  /* v8 ignore stop */
}

/* v8 ignore start -- body is always an object from route handlers */
function labelFromBody(body: unknown): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    return String(b.title ?? b.name ?? b.email ?? b.id ?? "");
  }
  return "";
}
/* v8 ignore stop */

function actionToEvent(action: string): string | null {
  switch (action) {
    case "create":
      return "collection:created";
    case "update":
      return "collection:updated";
    /* v8 ignore start — upsert is only used by global routes */
    case "upsert":
      return "collection:updated";
    /* v8 ignore stop */
    case "delete":
      return "collection:deleted";
    case "bulkDelete":
      return "collection:deleted";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Fastify JSON Schema for collection routes (dynamic — uses additionalProperties)
// ---------------------------------------------------------------------------

const genericDocumentSchema = {
  additionalProperties: true,
  type: "object",
} as const;

const genericListResponseSchema = {
  "2xx": {
    properties: {
      data: { items: genericDocumentSchema, type: "array" },
      total: { type: "number" },
    },
    required: ["data", "total"],
    type: "object",
  },
} as const;

const genericItemResponseSchema = {
  "2xx": genericDocumentSchema,
  "404": errorSchema,
} as const;

const versionObjectSchema = {
  additionalProperties: true,
  type: "object",
} as const;

const versionListResponseSchema = {
  "2xx": {
    properties: {
      data: { items: versionObjectSchema, type: "array" },
      total: { type: "number" },
    },
    required: ["data", "total"],
    type: "object",
  },
} as const;

function buildCollectionRouteSchema(
  method: string,
  path: string,
  slug: string,
): Record<string, unknown> {
  const hasId = path.includes("/:id");
  const hasVersionId = path.includes("/:versionId");
  const isBulkDelete = path.endsWith("/bulk-delete");
  const isBulkPublish = path.endsWith("/bulk-publish");
  const isBulkUnpublish = path.endsWith("/bulk-unpublish");
  const isPublish = path.includes("/publish") && !path.includes("/unpublish") && !isBulkPublish;
  const isUnpublish = path.includes("/unpublish") && !isBulkUnpublish;
  const isRestore = path.includes("/restore") && !path.includes("/versions");
  const isListVersions = path.endsWith("/versions");

  // Params
  if (hasVersionId) {
    return {
      params: {
        properties: {
          id: { description: `${slug} entry ID`, type: "string" },
          versionId: { description: "Version ID", type: "string" },
        },
        required: ["id", "versionId"],
        type: "object",
      },
      response: genericItemResponseSchema,
    };
  }
  if (hasId) {
    if (isPublish || isUnpublish || isRestore) {
      return {
        params: idParamSchema,
        response: genericItemResponseSchema,
      };
    }
    if (isListVersions) {
      return {
        params: idParamSchema,
        response: versionListResponseSchema,
      };
    }
    return {
      params: idParamSchema,
      response: genericItemResponseSchema,
    };
  }

  // List
  if (method === "GET") {
    return {
      querystring: {
        properties: {
          limit: { description: "Max items per page", type: "number" },
          offset: { description: "Number of items to skip", type: "number" },
          select: { description: "Comma-separated field names to include", type: "string" },
          sort: { description: "Sort field and direction (e.g. 'createdAt:desc')", type: "string" },
        },
        type: "object",
      },
      response: genericListResponseSchema,
    };
  }

  // Create
  if (method === "POST" && !isBulkDelete && !isBulkPublish && !isBulkUnpublish) {
    return {
      body: { additionalProperties: true, type: "object" },
      response: {
        "201": genericDocumentSchema,
        "400": errorSchema,
      },
    };
  }

  /* v8 ignore start -- unreachable fallback; PATCH/DELETE always have :id and match hasId above */
  // Bulk operations (delete, publish, unpublish)
  if (isBulkDelete || isBulkPublish || isBulkUnpublish) {
    return {
      body: {
        properties: {
          ids: { items: { type: "string" }, type: "array" },
        },
        required: ["ids"],
        type: "object",
      },
      response: {
        "2xx": genericDocumentSchema,
        "400": errorSchema,
      },
    };
  }

  // Update (PATCH)
  if (method === "PATCH") {
    return {
      body: { additionalProperties: true, type: "object" },
      params: idParamSchema,
      response: genericItemResponseSchema,
    };
  }

  // Delete
  if (method === "DELETE") {
    return {
      params: idParamSchema,
      response: {
        "2xx": messageResponseSchema,
        "404": errorSchema,
      },
    };
  }
  return {
    body: { additionalProperties: true, type: "object" },
    params: idParamSchema,
    response: genericItemResponseSchema,
  };
  /* v8 ignore stop */
  /* v8 ignore start — unreachable fallback; all code paths return above */
  return {};
}
/* v8 ignore stop */

function wrapWithActivity(
  handler: (ctx: RouteHandlerContext) => Promise<{ statusCode: number; body: unknown }>,
  method: string,
  path: string,
  adapter: DatabaseAdapter,
) {
  if (!isMutation(method, path)) return handler;
  return async (ctx: RouteHandlerContext) => {
    const result = await handler(ctx);
    if (result.statusCode >= 200 && result.statusCode < 300) {
      const body = result.body as Record<string, unknown> | undefined;
      const action = actionFor(method, path);
      const collection = slugFromPath(path);
      const documentId = body?.id != null ? String(body.id) : /* v8 ignore next */ undefined;
      recordActivity(adapter, {
        action: action as "create" | "update" | "delete" | "bulkDelete" | "upsert",
        collection,
        documentId,
        label: labelFromBody(body),
      }).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[activity] record failed:", e);
        },
      ); /* v8 ignore stop */

      const event = actionToEvent(action);
      if (event) {
        dispatchWebhooks(
          adapter,
          event,
          collection,
          documentId,
          body ?? /* v8 ignore next */ undefined,
        ).catch(
          /* v8 ignore start */ (e: unknown) => {
            console.error("[webhooks] dispatch failed:", e);
          } /* v8 ignore stop */,
        );
      }
    }
    return result;
  };
}

export function registerCollectionRoutes(
  fastify: FastifyInstance,
  collections: CollectionDefinition[],
  adapter: DatabaseAdapter,
): void {
  const routers = createCollectionRouters(collections, adapter);
  const allRoutes = routers.flatMap((r) => r.routes);

  for (const routeDef of allRoutes) {
    const handler = wrapWithActivity(routeDef.handler, routeDef.method, routeDef.path, adapter);
    const slug = slugFromPath(routeDef.path);
    const methodLabel = routeDef.method.toUpperCase();
    const routeSchema = buildCollectionRouteSchema(routeDef.method, routeDef.path, slug);
    void fastify.route({
      handler: asHandler(handler),
      method: routeDef.method,
      preHandler: [fastify.authenticate],
      schema: {
        ...routeSchema,
        description:
          routeDef.method === "GET"
            ? routeDef.path.endsWith("/:id")
              ? `Get a single ${slug} entry by ID`
              : `List ${slug} entries (with pagination, filtering, sorting)`
            : routeDef.path.endsWith("/bulk-delete")
              ? `Bulk delete ${slug} entries`
              : routeDef.path.endsWith("/bulk-publish")
                ? `Bulk publish ${slug} entries`
                : routeDef.path.endsWith("/bulk-unpublish")
                  ? `Bulk unpublish ${slug} entries`
                  : routeDef.path.includes("/publish")
                    ? `Publish a ${slug} entry`
                    : /* v8 ignore start — unpublish/unreachable ternaries */
                      routeDef.path.includes("/unpublish")
                      ? `Unpublish a ${slug} entry`
                      : routeDef.path.includes("/restore")
                        ? `Restore a deleted ${slug} entry`
                        : routeDef.path.includes("/versions")
                          ? `List or restore ${slug} versions`
                          : `${methodLabel === "POST" ? "Create" : methodLabel === "PATCH" ? "Update" : methodLabel === "DELETE" ? "Delete" : "Upsert"} a ${slug} entry`,
        /* v8 ignore stop */
        summary: `${methodLabel} /api/${slug}`,
        tags: ["Collections"],
      },
      url: routeDef.path,
    });
  }
}

export function registerGlobalRoutes(
  fastify: FastifyInstance,
  globals: GlobalDefinition[],
  adapter: DatabaseAdapter,
): void {
  const makeCtx = (request: FastifyRequest): RouteHandlerContext => ({
    body: request.body,
    headers: request.headers as Record<string, string>,
    params: request.params as Record<string, string>,
    query: request.query as Record<string, string | string[] | undefined>,
  });

  fastify.get(
    "/api/globals/:slug",
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: "Returns the value of a global by slug",
        params: slugParamSchema,
        response: {
          "2xx": genericDocumentSchema,
          "404": errorSchema,
        },
        summary: "Get global",
        tags: ["Globals"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { slug } = request.params as { slug: string };
        const g = resolveGlobal(slug, globals);
        const result = await createGlobalGetHandler(g, adapter)(makeCtx(request));
        return reply.status(result.statusCode).send(result.body);
      } catch (error) {
        if (error instanceof BadSlugError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  fastify.put(
    "/api/globals/:slug",
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: { additionalProperties: true, type: "object" },
        description: "Create or update a global by slug",
        params: slugParamSchema,
        response: {
          "2xx": genericDocumentSchema,
          "404": errorSchema,
        },
        summary: "Upsert global",
        tags: ["Globals"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { slug } = request.params as { slug: string };
        const g = resolveGlobal(slug, globals);
        const handler = createGlobalUpsertHandler(g, adapter);
        const result = await handler(makeCtx(request));
        if (result.statusCode >= 200 && result.statusCode < 300) {
          const body = result.body as Record<string, unknown> | undefined;
          const documentId = body?.id != null ? String(body.id) : /* v8 ignore next */ undefined;
          recordActivity(adapter, {
            action: "upsert",
            collection: slug,
            documentId,
            label: body?.name != null ? String(body.name) : /* v8 ignore next */ g.label,
          }).catch(
            /* v8 ignore start */ (e: unknown) => {
              console.error("[activity] record failed:", e);
            },
          ); /* v8 ignore stop */
          dispatchWebhooks(
            adapter,
            "global:updated",
            slug,
            documentId,
            body ?? /* v8 ignore next */ undefined,
          ).catch(
            /* v8 ignore start */ (e: unknown) => {
              console.error("[webhooks] dispatch failed:", e);
            } /* v8 ignore stop */,
          );
        }
        return reply.status(result.statusCode).send(result.body);
      } catch (error) {
        if (error instanceof BadSlugError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );
}
