import type { FastifyInstance } from "fastify";

import rateLimit from "@fastify/rate-limit";

export interface RateLimitOptions {
  max: number;
  timeWindow: string;
}

export async function registerRateLimit(
  fastify: FastifyInstance,
  options: RateLimitOptions,
): Promise<void> {
  await fastify.register(rateLimit, {
    max: options.max,
    timeWindow: options.timeWindow,
  });
}
