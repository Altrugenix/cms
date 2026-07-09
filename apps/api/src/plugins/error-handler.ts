import type { FastifyInstance } from "fastify";
import type { FastifyError } from "fastify";
import { AppError } from "../lib/errors.js";

export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler((error: FastifyError & AppError, _request, reply) => {
    let statusCode = error.statusCode ?? 500;
    let code = error.code;
    let message = error.message;

    if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
      statusCode = 413;
      message = "Request body too large";
      code = "PAYLOAD_TOO_LARGE";
    }

    if (
      error.code === "FST_ERR_CTP_INVALID_CONTENT_LENGTH" ||
      error.code === "FST_ERR_CTP_BODY_PARSE_FAILED"
    ) {
      statusCode = 400;
      code = "BAD_REQUEST";
    }

    if (statusCode === 500 && !(error instanceof AppError)) {
      message = "Internal server error";
      code = "INTERNAL_ERROR";
      fastify.log.error(error);
    }

    const response: Record<string, unknown> = { error: message, statusCode };
    if (code) response.code = code;
    if (error.details) response.details = error.details;

    reply.status(statusCode).send(response);
  });
}
