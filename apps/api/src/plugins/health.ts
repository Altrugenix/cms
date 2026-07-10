import type { FastifyInstance } from "fastify";
import type { DatabaseAdapter } from "@altrugenix/database";

export function registerHealth(fastify: FastifyInstance, adapter: DatabaseAdapter): void {
  fastify.get("/health", async () => {
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
  });
}
