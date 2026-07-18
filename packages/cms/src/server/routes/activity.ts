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
        description: "Returns activity log entries (with pagination)",
        querystring: {
          properties: {
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
      const query = request.query as { limit?: string; offset?: string };
      const limit = query.limit ? Math.max(1, Number(query.limit)) : 10;
      const data = await fetchRecentActivity(adapter, limit);
      const total = data.length;
      return { data, total };
    },
  );
}
