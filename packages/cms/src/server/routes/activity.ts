import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { fetchRecentActivity } from "../lib/activity.js";
import { activityListResponseSchema } from "../schemas/shared.js";

export function registerActivityRoutes(fastify: FastifyInstance, adapter: DatabaseAdapter): void {
  fastify.get(
    "/api/activity",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("read", "activity")],
      schema: {
        description: "Returns activity log entries (with pagination and optional filters)",
        querystring: {
          properties: {
            action: { description: "Filter by action (create, update, delete)", type: "string" },
            collection: { description: "Filter by collection slug", type: "string" },
            limit: { description: "Max items per page (default 10)", type: "number" },
            offset: { description: "Number of items to skip", type: "number" },
          },
          type: "object",
        },
        response: activityListResponseSchema,
        summary: "List recent activity",
        tags: ["System"],
      },
    },
    async (request: FastifyRequest) => {
      const query = request.query as {
        action?: string;
        collection?: string;
        limit?: string;
        offset?: string;
      };
      const limit = query.limit ? Math.max(1, Number(query.limit)) : /* v8 ignore next */ 10;
      const offset = query.offset ? Math.max(0, Number(query.offset)) : /* v8 ignore next */ 0;
      const data = await fetchRecentActivity(adapter, limit, {
        action: query.action || undefined,
        collection: query.collection || undefined,
        offset,
      });
      return { data, total: data.length };
    },
  );
}
