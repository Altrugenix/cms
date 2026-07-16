import type { FastifyInstance } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";

export function registerHealth(fastify: FastifyInstance, adapter: DatabaseAdapter): void {
  fastify.get(
    "/health",
    {
      schema: {
        summary: "Health check",
        description: "Returns server health status including database connectivity",
        tags: ["System"],
        security: [],
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
        status: dbStatus === "ok" ? "ok" : "degraded",
        db: dbStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    },
  );
}
