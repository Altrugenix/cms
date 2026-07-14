import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";
import { AccessControl } from "@arche-cms/permissions";

export interface PermissionPluginOptions {
  adapter: DatabaseAdapter;
}

export async function registerPermissions(
  fastify: FastifyInstance,
  options: PermissionPluginOptions,
): Promise<void> {
  const ac = new AccessControl(options.adapter);
  await ac.init();
  await ac.seedDefaultRoles();

  fastify.decorate("permissions", ac);

  fastify.decorate("requirePermission", (action: string, resource: string) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userRole = request.user?.role;
      if (!userRole) {
        return reply.status(401).send({ error: "Not authenticated" });
      }

      const allowed = await ac.check(userRole, action, resource);
      if (!allowed) {
        return reply.status(403).send({ error: "Forbidden" });
      }
    };
  });
}

declare module "fastify" {
  interface FastifyInstance {
    permissions: AccessControl;
    requirePermission: (
      action: string,
      resource: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
