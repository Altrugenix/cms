import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export interface SwaggerOptions {
  title: string;
  version: string;
  description: string;
}

export async function registerSwagger(
  fastify: FastifyInstance,
  options: SwaggerOptions,
): Promise<void> {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: options.title,
        version: options.version,
        description: options.description,
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
        contact: {
          name: "Arche CMS",
          url: "https://github.com/arche-cms/arche-cms",
        },
      },
      servers: [{ url: "/" }],
      externalDocs: {
        description: "Documentation",
        url: "https://arche-cms.dev/docs",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT access token from /api/auth/login",
          },
          apiKeyAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "cms_<token>",
            description: "CMS API token (cms_<64 hex chars>)",
          },
        },
      },
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
  });
}
