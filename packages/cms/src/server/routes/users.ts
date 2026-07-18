import type { AuthConfig } from "@arche-cms/auth";
import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { AuthService } from "@arche-cms/auth";

import {
  createUserBodySchema,
  errorSchema,
  idParamSchema,
  userListResponseSchema,
  userObjectSchema,
} from "../schemas/shared.js";

export function registerUserRoutes(
  fastify: FastifyInstance,
  adapter: DatabaseAdapter,
  config: AuthConfig,
): void {
  const authService = new AuthService(adapter, config);

  fastify.get(
    "/api/users",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("read", "users")],
      schema: {
        description: "Returns all registered users",
        response: userListResponseSchema,
        summary: "List users",
        tags: ["Users"],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const users = await authService.listUsers();
      return reply.send({ data: users, total: users.length });
    },
  );

  fastify.post(
    "/api/users",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("create", "users")],
      schema: {
        body: createUserBodySchema,
        description: "Create a new user account (requires create:users permission)",
        response: {
          "201": userObjectSchema,
          "400": errorSchema,
        },
        summary: "Create user",
        tags: ["Users"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { email: string; password: string; role?: string };
      if (!body.email || !body.password) {
        return reply.status(400).send({ error: "Email and password are required" });
      }
      try {
        const user = await authService.register(body);
        return reply.status(201).send({ user: user.user });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "User creation failed";
        return reply.status(400).send({ error: msg });
      }
    },
  );

  fastify.get(
    "/api/users/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("read", "users")],
      schema: {
        description: "Returns a single user by ID",
        params: idParamSchema,
        response: {
          "2xx": userObjectSchema,
          "404": errorSchema,
        },
        summary: "Get user",
        tags: ["Users"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = await authService.getUser(id);
      if (!user) return reply.status(404).send({ error: "User not found" });
      return reply.send(user);
    },
  );

  fastify.patch(
    "/api/users/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("update", "users")],
      schema: {
        body: {
          properties: {
            email: { format: "email", type: "string" },
            password: { minLength: 8, type: "string" },
            role: { type: "string" },
          },
          type: "object",
        },
        description: "Update a user's email, role, or password (requires update:users permission)",
        params: idParamSchema,
        response: {
          "2xx": userObjectSchema,
          "404": errorSchema,
        },
        summary: "Update user",
        tags: ["Users"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { email?: string; role?: string; password?: string };

      if (request.user?.sub === id && body.role !== undefined) {
        return reply.status(400).send({ error: "Cannot change your own role" });
      }

      const user = await authService.updateUser(id, body);
      if (!user) return reply.status(404).send({ error: "User not found" });
      return reply.send(user);
    },
  );

  fastify.delete(
    "/api/users/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("delete", "users")],
      schema: {
        description: "Delete a user account (requires delete:users permission)",
        params: idParamSchema,
        response: {
          "2xx": {
            properties: { message: { type: "string" } },
            required: ["message"],
            type: "object",
          },
          "404": errorSchema,
        },
        summary: "Delete user",
        tags: ["Users"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const deleted = await authService.deleteUser(id);
      if (!deleted) return reply.status(404).send({ error: "User not found" });
      return reply.send({ message: "User deleted" });
    },
  );
}
