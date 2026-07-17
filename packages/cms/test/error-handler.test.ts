import type { FastifyInstance } from "fastify";
import type { FastifyError } from "fastify";

import { describe, it, expect, vi } from "vitest";

import { AppError, NotFoundError, ValidationError } from "../src/server/lib/errors.js";
import { registerErrorHandler } from "../src/server/plugins/error-handler.js";

type ErrorHandler = (
  error: FastifyError & AppError,
  request: Record<string, unknown>,
  reply: { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> },
) => void;

function createMockReply() {
  const status = vi.fn().mockReturnThis();
  const send = vi.fn().mockReturnThis();
  return { send, status };
}

function createMockFastify(cb: (h: ErrorHandler) => void): FastifyInstance {
  const setErrorHandler = vi.fn((h: ErrorHandler) => {
    cb(h);
  }) as unknown as FastifyInstance["setErrorHandler"];
  const log = { error: vi.fn() };
  return { log, setErrorHandler } as unknown as FastifyInstance;
}

describe("registerErrorHandler", () => {
  it("handles NotFoundError correctly", () => {
    let capturedHandler: ErrorHandler;
    const fastify = createMockFastify((h) => {
      capturedHandler = h;
    });
    registerErrorHandler(fastify);
    expect(fastify.setErrorHandler).toHaveBeenCalledTimes(1);

    const reply = createMockReply();
    const error = new NotFoundError("Post", "42") as FastifyError & AppError;
    capturedHandler(error, {}, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({
      code: "NOT_FOUND",
      error: "Post not found: 42",
      statusCode: 404,
    });
  });

  it("handles ValidationError with details", () => {
    let capturedHandler: ErrorHandler;
    const fastify = createMockFastify((h) => {
      capturedHandler = h;
    });
    registerErrorHandler(fastify);

    const reply = createMockReply();
    const error = new ValidationError("Bad input", { field: "email" }) as FastifyError & AppError;
    capturedHandler(error, {}, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      code: "VALIDATION_ERROR",
      details: { field: "email" },
      error: "Bad input",
      statusCode: 400,
    });
  });

  it("handles non-AppError server errors as 500 internal", () => {
    let capturedHandler: ErrorHandler;
    const fastify = createMockFastify((h) => {
      capturedHandler = h;
    });
    registerErrorHandler(fastify);

    const reply = createMockReply();
    const error = new Error("DB crash") as FastifyError & AppError;
    capturedHandler(error, {}, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      code: "INTERNAL_ERROR",
      error: "Internal server error",
      statusCode: 500,
    });
    expect(fastify.log.error).toHaveBeenCalledWith(error);
  });

  it("handles body too large errors as 413", () => {
    let capturedHandler: ErrorHandler;
    const fastify = createMockFastify((h) => {
      capturedHandler = h;
    });
    registerErrorHandler(fastify);

    const reply = createMockReply();
    const error = new Error("Body too large") as FastifyError & AppError;
    error.code = "FST_ERR_CTP_BODY_TOO_LARGE";
    capturedHandler(error, {}, reply);

    expect(reply.status).toHaveBeenCalledWith(413);
    expect(reply.send).toHaveBeenCalledWith({
      code: "PAYLOAD_TOO_LARGE",
      error: "Request body too large",
      statusCode: 413,
    });
  });

  it("handles invalid content length as 400", () => {
    let capturedHandler: ErrorHandler;
    const fastify = createMockFastify((h) => {
      capturedHandler = h;
    });
    registerErrorHandler(fastify);

    const reply = createMockReply();
    const error = new Error("Bad length") as FastifyError & AppError;
    error.code = "FST_ERR_CTP_INVALID_CONTENT_LENGTH";
    capturedHandler(error, {}, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      code: "BAD_REQUEST",
      error: "Bad length",
      statusCode: 400,
    });
  });

  it("handles body parse error as 400", () => {
    let capturedHandler: ErrorHandler;
    const fastify = createMockFastify((h) => {
      capturedHandler = h;
    });
    registerErrorHandler(fastify);

    const reply = createMockReply();
    const error = new Error("Parse fail") as FastifyError & AppError;
    error.code = "FST_ERR_CTP_BODY_PARSE_FAILED";
    capturedHandler(error, {}, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      code: "BAD_REQUEST",
      error: "Parse fail",
      statusCode: 400,
    });
  });
});
