import type { FastifyInstance } from "fastify";

import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);

function findAdminDir(): string | null {
  const envDir = process.env.CMS_ADMIN_DIR;
  if (envDir && existsSync(envDir)) return envDir;

  let dir = dirname(currentFile);
  for (let i = 0; i < 10; i++) {
    const candidate = resolve(dir, "admin");
    if (existsSync(candidate) && existsSync(resolve(candidate, "index.html"))) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export interface AdminStaticOptions {
  adminDir?: string | undefined;
}

export async function registerAdminStatic(
  fastify: FastifyInstance,
  options: AdminStaticOptions,
): Promise<void> {
  const adminDir = options.adminDir ?? findAdminDir();

  if (!adminDir) {
    fastify.log.warn(
      "Admin panel build not found. " +
        "The admin UI will not be available. " +
        "Build it with: pnpm --filter @arche-cms/admin build " +
        "or set CMS_ADMIN_DIR env var.",
    );
    return;
  }

  fastify.log.info(`Serving admin panel from ${adminDir}`);

  await fastify.register(fastifyStatic, {
    prefix: "/",
    root: adminDir,
    wildcard: false,
  });

  fastify.setNotFoundHandler((_request, reply) => {
    void reply.sendFile("index.html");
  });
}
