import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { DatabaseAdapter } from "@altrugenix/database";
import { AuthService, JwtService } from "@altrugenix/auth";
import type { AuthConfig } from "@altrugenix/auth";

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

  fastify.decorate("auth", authService);

  fastify.decorateRequest("user", null);

  // JWT verification preHandler
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing or invalid authorization header" });
    }

    const token = header.slice(7);
    try {
      const payload = await jwtService.verifyAccessToken(token);
      request.user = payload;
    } catch {
      return reply.status(401).send({ error: "Invalid or expired token" });
    }
  });

  // Auth routes (public)
  fastify.post(
    "/api/auth/register",
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
        return reply.status(201).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Registration failed";
        return reply.status(400).send({ error: message });
      }
    },
  );

  fastify.post(
    "/api/auth/login",
    async (
      request: FastifyRequest<{ Body: { email: string; password: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await authService.login(request.body);
        return reply.send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        return reply.status(401).send({ error: message });
      }
    },
  );

  fastify.post(
    "/api/auth/refresh",
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
    { preHandler: [fastify.authenticate] },
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
  fastify.get("/api/auth/setup-status", async () => {
    const users = await authService.listUsers();
    return { hasAdmin: users.length > 0 };
  });
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
