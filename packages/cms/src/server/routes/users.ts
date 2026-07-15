import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";
import type { AuthConfig } from "@arche-cms/auth";
import { AuthService } from "@arche-cms/auth";

export function registerUserRoutes(
  fastify: FastifyInstance,
  adapter: DatabaseAdapter,
  config: AuthConfig,
): void {
  const authService = new AuthService(adapter, config);

  fastify.get(
    "/api/users",
    { preHandler: [fastify.authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const users = await authService.listUsers();
      return reply.send({ data: users, total: users.length });
    },
  );

  fastify.get(
    "/api/users/:id",
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = await authService.getUser(id);
      if (!user) return reply.status(404).send({ error: "User not found" });
      return reply.send(user);
    },
  );

  fastify.patch(
    "/api/users/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("update", "users")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { email?: string; role?: string; password?: string };
      const user = await authService.updateUser(id, body);
      if (!user) return reply.status(404).send({ error: "User not found" });
      return reply.send(user);
    },
  );

  fastify.delete(
    "/api/users/:id",
    { preHandler: [fastify.authenticate, fastify.requirePermission("delete", "users")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const deleted = await authService.deleteUser(id);
      if (!deleted) return reply.status(404).send({ error: "User not found" });
      return reply.send({ message: "User deleted" });
    },
  );
}
