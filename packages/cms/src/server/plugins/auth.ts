import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { DatabaseAdapter } from "@arche-cms/database";
import { AuthService, JwtService } from "@arche-cms/auth";
import type { AuthConfig } from "@arche-cms/auth";
import { verifyApiToken, ensureApiTokensTable } from "../routes/api-tokens.js";

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
  await authService.seedDefaultAdmin("admin123");

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
    "/api/auth/register",
    {
      schema: {
        ...publicSchema,
        summary: "Register a new user",
        description: "Create a new user account (requires setup to be complete)",
        tags: ["Auth"],
      },
    },
    async (
      request: FastifyRequest<{ Body: { email: string; password: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { email, password } = request.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return reply
            .status(400)
            .send({ error: "Invalid email format", code: "VALIDATION_ERROR" });
        }

        if (password && password.length < 8) {
          return reply
            .status(400)
            .send({ error: "Password must be at least 8 characters", code: "VALIDATION_ERROR" });
        }

        const result = await authService.register({ ...request.body, role: undefined });
        return reply.status(201).send({ user: result.user, ...result.tokens });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Registration failed";
        return reply.status(400).send({ error: message });
      }
    },
  );

  fastify.post(
    "/api/auth/login",
    {
      schema: {
        ...publicSchema,
        summary: "Login",
        description: "Authenticate with email and password, returns JWT tokens",
        tags: ["Auth"],
      },
    },
    async (
      request: FastifyRequest<{ Body: { email: string; password: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await authService.login(request.body);
        return reply.send({ user: result.user, ...result.tokens });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        return reply.status(401).send({ error: message });
      }
    },
  );

  fastify.post(
    "/api/auth/refresh",
    {
      schema: {
        ...publicSchema,
        summary: "Refresh tokens",
        description: "Exchange a refresh token for a new access token and refresh token pair",
        tags: ["Auth"],
      },
    },
    async (request: FastifyRequest<{ Body: { refreshToken: string } }>, reply: FastifyReply) => {
      try {
        const tokens = await authService.refresh(request.body.refreshToken);
        return reply.send(tokens);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Token refresh failed";
        return reply.status(401).send({ error: message });
      }
    },
  );

  fastify.post(
    "/api/auth/forgot-password",
    {
      schema: {
        ...publicSchema,
        summary: "Forgot password",
        description:
          "Request a password reset email (always returns success to prevent email enumeration)",
        tags: ["Auth"],
      },
    },
    async (request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) => {
      try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(request.body.email)) {
          return reply
            .status(400)
            .send({ error: "Invalid email format", code: "VALIDATION_ERROR" });
        }
        await authService.forgotPassword(request.body);
        return reply.send({
          message: "If that email is registered, a reset link has been sent",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to process request";
        return reply.status(400).send({ error: message });
      }
    },
  );

  fastify.post(
    "/api/auth/reset-password",
    {
      schema: {
        ...publicSchema,
        summary: "Reset password",
        description: "Reset password using a token from the forgot-password email",
        tags: ["Auth"],
      },
    },
    async (
      request: FastifyRequest<{ Body: { token: string; password: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await authService.resetPassword(request.body);
        return reply.send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to reset password";
        return reply.status(400).send({ error: message });
      }
    },
  );

  fastify.get(
    "/api/auth/me",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Get current user",
        description: "Returns the authenticated user's profile",
        tags: ["Auth"],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.sub;
      if (!userId) {
        return reply.status(401).send({ error: "Not authenticated" });
      }
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
        summary: "Setup status",
        description: "Check if the CMS has been set up (at least one admin user exists)",
        tags: ["Auth"],
        security: [],
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
