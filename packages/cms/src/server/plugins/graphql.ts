import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition } from "@arche-cms/types";
import type { FastifyInstance } from "fastify";

import { generateTypeDefs, generateResolvers } from "@arche-cms/graphql";
import mercurius from "mercurius";

export async function registerGraphQL(
  fastify: FastifyInstance,
  collections: CollectionDefinition[],
  adapter: DatabaseAdapter,
): Promise<void> {
  const typeDefs = generateTypeDefs(collections);
  const resolvers = generateResolvers(collections, adapter);

  if (fastify.hasDecorator("authenticate")) {
    fastify.addHook("onRoute", (routeOptions) => {
      if (routeOptions.url === "/graphql" || routeOptions.url === "/graphiql") {
        if (!routeOptions.preHandler) routeOptions.preHandler = [];
        if (Array.isArray(routeOptions.preHandler)) {
          routeOptions.preHandler.push(fastify.authenticate);
        }
      }
    });
  }

  await fastify.register(mercurius, {
    graphiql: true,
    resolvers,
    schema: typeDefs,
  });
}
