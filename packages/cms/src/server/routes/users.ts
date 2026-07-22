import type { AuthConfig } from "@arche-cms/auth";
import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { AuthService } from "@arche-cms/auth";

import { recordActivity } from "../lib/activity.js";
import { dispatchWebhooks } from "../lib/webhooks.js";
import {
  authUserResponseSchema,
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
        description: "Returns all registered users (with pagination)",
        querystring: {
          properties: {
            limit: { description: "Max items per page", type: "number" },
            offset: { description: "Number of items to skip", type: "number" },
          },
          type: "object",
        },
        response: userListResponseSchema,
        summary: "List users",
        tags: ["Users"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { limit?: string; offset?: string };
      const limit = query.limit ? Math.max(1, Number(query.limit)) : undefined;
      const offset = query.offset ? Math.max(0, Number(query.offset)) : undefined;
      const allUsers = await authService.listUsers();
      const total = allUsers.length;
      const users =
        limit !== undefined ? allUsers.slice(offset ?? 0, (offset ?? 0) + limit) : allUsers;
      return reply.send({ data: users, total });
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
          "201": authUserResponseSchema,
          "400": errorSchema,
        },
        summary: "Create user",
        tags: ["Users"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        email: string;
        password: string;
        name?: string;
        role?: string;
      };
      /* v8 ignore start — Fastify schema validation rejects missing email/password before handler */
      if (!body.email || !body.password) {
        return reply.status(400).send({ error: "Email and password are required" });
      }
      /* v8 ignore stop */
      try {
        const user = await authService.register(body);
        const userId =
          user.user?.id != null ? String(user.user.id) : /* v8 ignore next */ undefined;
        recordActivity(adapter, {
          action: "create",
          collection: "users",
          documentId: userId,
          label: body.email,
        }).catch(
          /* v8 ignore start */ (e: unknown) => {
            console.error("[activity] record failed:", e);
          },
        ); /* v8 ignore stop */
        dispatchWebhooks(
          adapter,
          "user:created",
          "users",
          userId,
          user.user as unknown as Record<string, unknown>,
        ).catch(
          /* v8 ignore start */ (e: unknown) => {
            console.error("[webhooks] dispatch failed:", e);
          },
        ); /* v8 ignore stop */
        return reply.status(201).send({ user: user.user });
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : /* v8 ignore next */ "User creation failed";
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
            name: { type: "string" },
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
      const body = request.body as {
        email?: string;
        name?: string;
        role?: string;
        password?: string;
      };

      if (request.user?.sub === id && body.role !== undefined) {
        return reply.status(400).send({ error: "Cannot change your own role" });
      }

      const user = await authService.updateUser(id, body);
      if (!user) return reply.status(404).send({ error: "User not found" });
      recordActivity(adapter, {
        action: "update",
        collection: "users",
        documentId: id,
        label: body.email ?? "",
      }).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[activity] record failed:", e);
        },
      ); /* v8 ignore stop */
      dispatchWebhooks(
        adapter,
        "user:updated",
        "users",
        id,
        user as unknown as Record<string, unknown>,
      ).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[webhooks] dispatch failed:", e);
        },
      ); /* v8 ignore stop */
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
      if (id === "1") {
        return reply.status(400).send({ error: "Cannot delete the default admin user" });
      }
      const deleted = await authService.deleteUser(id);
      if (!deleted) return reply.status(404).send({ error: "User not found" });
      recordActivity(adapter, {
        action: "delete",
        collection: "users",
        documentId: id,
      }).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[activity] record failed:", e);
        },
      ); /* v8 ignore stop */
      dispatchWebhooks(adapter, "user:deleted", "users", id).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[webhooks] dispatch failed:", e);
        },
      ); /* v8 ignore stop */
      return reply.send({ message: "User deleted" });
    },
  );
}
