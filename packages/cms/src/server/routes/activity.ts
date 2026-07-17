import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

import { fetchRecentActivity } from "../lib/activity.js";

export function registerActivityRoutes(fastify: FastifyInstance, adapter: DatabaseAdapter): void {
  fastify.get(
    "/api/activity",
    {
      schema: {
        description: "Returns the 10 most recent activity log entries",
        security: [],
        summary: "List recent activity",
        tags: ["System"],
      },
    },
    async () => {
      const data = await fetchRecentActivity(adapter, 10);
      return { data, total: data.length };
    },
  );
}
