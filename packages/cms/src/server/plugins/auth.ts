import type { AuthConfig } from "@arche-cms/auth";
import type { DatabaseAdapter } from "@arche-cms/database";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { AuthService, JwtService } from "@arche-cms/auth";
import { randomBytes } from "node:crypto";

import { verifyApiToken, ensureApiTokensTable } from "../routes/api-tokens.js";
import {
  authTokensResponseSchema,
  authUserResponseSchema,
  errorSchema,
  errorWithCodeSchema,
  forgotPasswordBodySchema,
  hasAdminResponseSchema,
  loginBodySchema,
  messageResponseSchema,
  refreshBodySchema,
  resetPasswordBodySchema,
  userObjectSchema,
} from "../schemas/shared.js";

const publicSchema = {
  security: [] as const,
};

export interface AuthPluginOptions {
  adapter: DatabaseAdapter;
  config: AuthConfig;
}

export async function registerAuth(
  fastify: FastifyInstance,
  options: AuthPluginOptions,
): Promise<void> {
  const authService = new AuthService(options.adapter, options.config);
  const jwtService = new JwtService(options.config);

  await authService.init();

  const adminPassword =
    options.config.adminPassword ?? /* v8 ignore next */ randomBytes(16).toString("base64url");
  await authService.seedDefaultAdmin(adminPassword);
  /* v8 ignore start — only runs when no adminPassword is configured */
  if (!options.config.adminPassword) {
    fastify.log.info(`Default admin password: ${adminPassword}`);
  }
  /* v8 ignore stop */

  // Ensure the api_tokens table exists so API key auth can work
  await ensureApiTokensTable(options.adapter);

  fastify.decorate("auth", authService);

  fastify.decorateRequest("user", null);

  // JWT verification preHandler with API token fallback
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing or invalid authorization header" });
    }

    const token = header.slice(7);

    // Try JWT first
    try {
      const payload = await jwtService.verifyAccessToken(token);
      request.user = payload;
      return;
    } catch {
      // JWT failed — try API token
    }

    // Fall back to API token lookup
    const apiResult = await verifyApiToken(options.adapter, token);
    if (apiResult) {
      request.user = apiResult.user;
      return;
    }

    return reply.status(401).send({ error: "Invalid or expired token" });
  });

  // Auth routes (public)
  fastify.post(
    "/api/auth/login",
    {
      schema: {
        ...publicSchema,
        body: loginBodySchema,
        description: "Authenticate with email and password, returns JWT tokens",
        response: {
          "2xx": {
            ...authUserResponseSchema,
            ...authTokensResponseSchema,
            properties: {
              ...authUserResponseSchema.properties,
              ...authTokensResponseSchema.properties,
            },
          },
          "401": errorSchema,
        },
        summary: "Login",
        tags: ["Auth"],
      },
    },
    async (
      request: FastifyRequest<{ Body: { email: string; password: string; rememberMe?: boolean } }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await authService.login(request.body);
        return reply.send({ user: result.user, ...result.tokens });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : /* v8 ignore next */ "Login failed";
        return reply.status(401).send({ error: message });
      }
    },
  );

  fastify.post(
    "/api/auth/refresh",
    {
      schema: {
        ...publicSchema,
        body: refreshBodySchema,
        description: "Exchange a refresh token for a new access token and refresh token pair",
        response: {
          "2xx": authTokensResponseSchema,
          "401": errorSchema,
        },
        summary: "Refresh tokens",
        tags: ["Auth"],
      },
    },
    async (request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) => {
      try {
        const tokens = await authService.refresh(request.body.refreshToken);
        return reply.send(tokens);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : /* v8 ignore next */ "Token refresh failed";
        return reply.status(401).send({ error: message });
      }
    },
  );

  fastify.post(
    "/api/auth/forgot-password",
    {
      schema: {
        ...publicSchema,
        body: forgotPasswordBodySchema,
        description:
          "Request a password reset email (always returns success to prevent email enumeration)",
        response: {
          "2xx": messageResponseSchema,
          "400": errorWithCodeSchema,
        },
        summary: "Forgot password",
        tags: ["Auth"],
      },
    },
    async (request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) => {
      try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(request.body.email)) {
          return reply
            .status(400)
            .send({ code: "VALIDATION_ERROR", error: "Invalid email format" });
        }
        await authService.forgotPassword(request.body);
        return reply.send({
          message: "If that email is registered, a reset link has been sent",
        });
        /* v8 ignore start — defensive catch for forgot-password service errors */
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to process request";
        return reply.status(400).send({ error: message });
      } /* v8 ignore stop */
    },
  );

  fastify.post(
    "/api/auth/reset-password",
    {
      schema: {
        ...publicSchema,
        body: resetPasswordBodySchema,
        description: "Reset password using a token from the forgot-password email",
        response: {
          "2xx": messageResponseSchema,
          "400": errorSchema,
        },
        summary: "Reset password",
        tags: ["Auth"],
      },
    },
    async (
      request: FastifyRequest<{ Body: { token: string; password: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        /* v8 ignore next -- requires valid reset token to reach success path */
        const result = await authService.resetPassword(request.body);
        return reply.send(result);
      } catch (/* v8 ignore start */ error) {
        const message =
          error instanceof Error ? error.message : /* v8 ignore next */ "Failed to reset password";
        return reply.status(400).send({ error: message });
      } /* v8 ignore stop */
    },
  );

  fastify.get(
    "/api/auth/me",
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: "Returns the authenticated user's profile",
        response: {
          "2xx": userObjectSchema,
          "401": errorSchema,
          "404": errorSchema,
        },
        summary: "Get current user",
        tags: ["Auth"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      /* v8 ignore start — defensive: authenticate preHandler should always set sub */
      if (!userId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }
      /* v8 ignore stop */
      const user = await authService.me(userId);
      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }
      return reply.send(user);
    },
  );

  // GET /api/auth/setup-status — check if any admin user exists
  fastify.get(
    "/api/auth/setup-status",
    {
      schema: {
        description: "Check if the CMS has been set up (at least one admin user exists)",
        response: {
          "2xx": hasAdminResponseSchema,
        },
        security: [],
        summary: "Setup status",
        tags: ["Auth"],
      },
    },
    async () => {
      const users = await authService.listUsers();
      return { hasAdmin: users.length > 0 };
    },
  );
}

// Augment Fastify types
declare module "fastify" {
  interface FastifyInstance {
    auth: AuthService;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: { sub: string; email: string; role: string } | null;
  }
}
