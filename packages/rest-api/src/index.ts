export type {
  RouteHandlerContext,
  RouteHandlerResult,
  RouteHandler,
  RouteDefinition,
  CollectionRouter,
  RouteGeneratorConfig,
  CreateCollectionRouter,
  MiddlewareHooks,
  BeforeHook,
  AfterHook,
} from "./types.js";

export { applyMiddleware } from "./middleware.js";

export {
  createCollectionRouter,
  createCollectionRouters,
  createGlobalRouter,
  createGlobalRouters,
} from "./route-generator.js";

export {
  createListHandler,
  createGetHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler,
  createBulkDeleteHandler,
  createBulkPublishHandler,
  createBulkUnpublishHandler,
  createGlobalGetHandler,
  createGlobalUpsertHandler,
} from "./handlers.js";

export { generateOpenApiSpec } from "./openapi.js";
export type { OpenApiOptions } from "./openapi.js";

export { registerRoutes } from "./register.js";
export type { RouterAdapter } from "./register.js";
