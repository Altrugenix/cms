import type { FastifyInstance } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";
import { fetchRecentActivity } from "../lib/activity.js";

export function registerActivityRoutes(fastify: FastifyInstance, adapter: DatabaseAdapter): void {
  fastify.get(
    "/api/activity",
    {
      schema: {
        summary: "List recent activity",
        description: "Returns the 10 most recent activity log entries",
        tags: ["System"],
        security: [],
      },
    },
    async () => {
      const data = await fetchRecentActivity(adapter, 10);
      return { data, total: data.length };
    },
  );
}
