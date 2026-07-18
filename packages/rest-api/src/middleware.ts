import type { CollectionDefinition } from "@arche-cms/types";

import type {
  RouteHandler,
  RouteHandlerContext,
  RouteHandlerResult,
  MiddlewareHooks,
} from "./types.js";

export function applyMiddleware(
  handler: RouteHandler,
  hooks: MiddlewareHooks | undefined,
  collection?: CollectionDefinition,
): RouteHandler {
  if (!hooks || (!hooks.before?.length && !hooks.after?.length)) {
    return handler;
  }

  return async (ctx: RouteHandlerContext): Promise<RouteHandlerResult> => {
    if (hooks.before) {
      for (const hook of hooks.before) {
        const result = await hook(ctx, collection);
        if (result) return result;
      }
    }

    const result = await handler(ctx);

    if (hooks.after) {
      let finalResult = result;
      for (const hook of hooks.after) {
        finalResult = await hook(ctx, finalResult, collection);
      }
      return finalResult;
    }

    return result;
  };
}
