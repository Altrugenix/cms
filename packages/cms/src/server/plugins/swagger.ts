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
      components: {
        securitySchemes: {
          apiKeyAuth: {
            bearerFormat: "cms_<token>",
            description: "CMS API token (cms_<64 hex chars>)",
            scheme: "bearer",
            type: "http",
          },
          bearerAuth: {
            bearerFormat: "JWT",
            description: "JWT access token from /api/auth/login",
            scheme: "bearer",
            type: "http",
          },
        },
      },
      externalDocs: {
        description: "Documentation",
        url: "https://arche-cms.dev/docs",
      },
      info: {
        contact: {
          name: "Arche CMS",
          url: "https://github.com/arche-cms/arche-cms",
        },
        description: options.description,
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
        title: options.title,
        version: options.version,
      },
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      servers: [{ url: "/" }],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
  });
}
