import type { DatabaseAdapter } from "@arche-cms/database";
import type { Permission } from "@arche-cms/permissions";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { AccessControl } from "@arche-cms/permissions";

import { recordActivity } from "../lib/activity.js";
import { dispatchWebhooks } from "../lib/webhooks.js";
import {
  createRoleBodySchema,
  errorSchema,
  idParamSchema,
  permissionObjectSchema,
  roleListResponseSchema,
  roleObjectSchema,
} from "../schemas/shared.js";

export function registerRoleRoutes(fastify: FastifyInstance, adapter: DatabaseAdapter): void {
  const ac = new AccessControl(adapter);

  fastify.get(
    "/api/roles",
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: "Returns all roles with their permissions (with pagination)",
        querystring: {
          properties: {
            limit: { description: "Max items per page", type: "number" },
            offset: { description: "Number of items to skip", type: "number" },
          },
          type: "object",
        },
        response: roleListResponseSchema,
        summary: "List roles",
        tags: ["Roles"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { limit?: string; offset?: string };
      const limit = query.limit ? Math.max(1, Number(query.limit)) : undefined;
      const offset = query.offset ? Math.max(0, Number(query.offset)) : undefined;
      const allRoles = await ac.getAllRoles();
      const total = allRoles.length;
      const roles =
        limit !== undefined ? allRoles.slice(offset ?? 0, (offset ?? 0) + limit) : allRoles;
      return reply.send({ data: roles, total });
    },
  );

  fastify.get(
    "/api/roles/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: "Returns a single role by ID with its permissions",
        params: idParamSchema,
        response: {
          "2xx": roleObjectSchema,
          "404": errorSchema,
        },
        summary: "Get role",
        tags: ["Roles"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const role = await ac.getRoleById(id);
      if (!role) return reply.status(404).send({ error: "Role not found" });
      return reply.send(role);
    },
  );

  fastify.post(
    "/api/roles",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "roles")],
      schema: {
        body: createRoleBodySchema,
        description: "Create a new role with permissions (requires manage:roles permission)",
        response: {
          "201": roleObjectSchema,
          "400": errorSchema,
        },
        summary: "Create role",
        tags: ["Roles"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        name: string;
        description: string;
        permissions: Array<{ action: string; resource: string }>;
      };
      try {
        const role = await ac.createRole(
          body.name,
          body.description,
          body.permissions as Permission[],
        );
        const roleRec = role as unknown as Record<string, unknown>;
        const roleId = roleRec.id != null ? String(roleRec.id) : /* v8 ignore next */ undefined;
        recordActivity(adapter, {
          action: "create",
          collection: "roles",
          documentId: roleId,
          label: body.name,
        }).catch(
          /* v8 ignore start */ (e: unknown) => {
            console.error("[activity] record failed:", e);
          },
        ); /* v8 ignore stop */
        dispatchWebhooks(adapter, "role:created", "roles", roleId, roleRec).catch(
          /* v8 ignore start */ (e: unknown) => {
            console.error("[webhooks] dispatch failed:", e);
          },
        ); /* v8 ignore stop */
        return reply.status(201).send(role);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : /* v8 ignore next */ "Failed to create role";
        return reply.status(400).send({ error: message });
      }
    },
  );

  fastify.patch(
    "/api/roles/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "roles")],
      schema: {
        body: {
          properties: {
            description: { type: "string" },
            name: { type: "string" },
            permissions: { items: permissionObjectSchema, type: "array" },
          },
          type: "object",
        },
        description:
          "Update a role's name, description, or permissions (requires manage:roles permission)",
        params: idParamSchema,
        response: {
          "2xx": roleObjectSchema,
          "404": errorSchema,
        },
        summary: "Update role",
        tags: ["Roles"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        description?: string;
        permissions?: Array<{ action: string; resource: string }>;
      };
      const role = await ac.updateRole(id, {
        ...(body.name != null && { name: body.name }),
        ...(body.description != null && { description: body.description }),
        ...(body.permissions != null && { permissions: body.permissions as Permission[] }),
      });
      if (!role) return reply.status(404).send({ error: "Role not found" });
      recordActivity(adapter, {
        action: "update",
        collection: "roles",
        documentId: id,
        label: body.name ?? "",
      }).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[activity] record failed:", e);
        },
      ); /* v8 ignore stop */
      dispatchWebhooks(
        adapter,
        "role:updated",
        "roles",
        id,
        role as unknown as Record<string, unknown>,
      ).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[webhooks] dispatch failed:", e);
        },
      ); /* v8 ignore stop */
      return reply.send(role);
    },
  );

  fastify.delete(
    "/api/roles/:id",
    {
      preHandler: [fastify.authenticate, fastify.requirePermission("manage", "roles")],
      schema: {
        description: "Delete a role (requires manage:roles permission)",
        params: idParamSchema,
        response: {
          "2xx": {
            properties: { message: { type: "string" } },
            required: ["message"],
            type: "object",
          },
          "404": errorSchema,
        },
        summary: "Delete role",
        tags: ["Roles"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const deleted = await ac.deleteRole(id);
      if (!deleted) return reply.status(404).send({ error: "Role not found" });
      recordActivity(adapter, {
        action: "delete",
        collection: "roles",
        documentId: id,
      }).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[activity] record failed:", e);
        },
      ); /* v8 ignore stop */
      dispatchWebhooks(adapter, "role:deleted", "roles", id).catch(
        /* v8 ignore start */ (e: unknown) => {
          console.error("[webhooks] dispatch failed:", e);
        },
      ); /* v8 ignore stop */
      return reply.send({ message: "Role deleted" });
    },
  );
}
