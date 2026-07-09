import type { FastifyInstance } from "fastify";
import mercurius from "mercurius";
import type { DatabaseAdapter } from "@altrugenix/database";
import type { CollectionDefinition } from "@altrugenix/types";
import { generateTypeDefs, generateResolvers } from "@altrugenix/graphql";

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
    schema: typeDefs,
    resolvers,
    graphiql: true,
  });
}
