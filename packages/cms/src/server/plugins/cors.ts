import type { FastifyInstance } from "fastify";

import cors from "@fastify/cors";

export async function registerCors(
  fastify: FastifyInstance,
  origin: string | string[],
): Promise<void> {
  await fastify.register(cors, { origin });
}
