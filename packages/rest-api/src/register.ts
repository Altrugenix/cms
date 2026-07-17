import type { RouteDefinition, RouteHandlerContext, RouteHandlerResult } from "./types.js";

export interface RouterAdapter {
  route(opts: {
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    url: string;
    handler: (
      request: {
        params: Record<string, string>;
        query: Record<string, string | string[] | undefined>;
        body: unknown;
        headers: Record<string, string>;
      },
      reply: {
        status: (code: number) => {
          send: (body: unknown) => void;
          header: (key: string, value: string) => void;
        };
      },
    ) => void;
  }): void;
}

export function registerRoutes(router: RouterAdapter, routes: RouteDefinition[]): void {
  for (const route of routes) {
    router.route({
      handler: (request, reply) => {
        const context: RouteHandlerContext = {
          body: request.body,
          headers: request.headers,
          params: request.params,
          query: request.query,
        };

        route
          .handler(context)
          .then((result: RouteHandlerResult) => {
            const r = reply.status(result.statusCode);
            if (result.headers) {
              for (const [key, value] of Object.entries(result.headers)) {
                r.header(key, value);
              }
            }
            r.send(result.body);
          })
          .catch((err: Error) => {
            reply.status(500).send({ error: err.message ?? "Internal server error" });
          });
      },
      method: route.method,
      url: route.path,
    });
  }
}
