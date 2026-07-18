import type { FastifyInstance } from "fastify";

export function registerRequestLogger(fastify: FastifyInstance): void {
  fastify.addHook("onResponse", (request, reply, done) => {
    fastify.log.info(
      {
        method: request.method,
        responseTime: reply.elapsedTime,
        statusCode: reply.statusCode,
        url: request.url,
      },
      "request completed",
    );
    done();
  });
}
