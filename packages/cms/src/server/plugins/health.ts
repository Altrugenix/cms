import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance } from "fastify";

export function registerHealth(fastify: FastifyInstance, adapter: DatabaseAdapter): void {
  fastify.get(
    "/health",
    {
      schema: {
        description: "Returns server health status including database connectivity",
        security: [],
        summary: "Health check",
        tags: ["System"],
      },
    },
    async () => {
      let dbStatus = "ok";
      try {
        await adapter.raw("SELECT 1");
      } catch {
        dbStatus = "error";
      }
      return {
        db: dbStatus,
        status: dbStatus === "ok" ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    },
  );
}
