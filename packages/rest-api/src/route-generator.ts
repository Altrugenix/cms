import type { DatabaseAdapter } from "@altrugenix/database";
import type { CollectionDefinition, GlobalDefinition } from "@altrugenix/types";
import type { RouteDefinition, RouteGeneratorConfig, CollectionRouter } from "./types.js";
import { applyMiddleware } from "./middleware.js";
import {
  createListHandler,
  createGetHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler,
  createBulkDeleteHandler,
  createPublishHandler,
  createUnpublishHandler,
  createRestoreHandler,
  createListVersionsHandler,
  createRestoreVersionHandler,
  createGlobalGetHandler,
  createGlobalUpsertHandler,
} from "./handlers.js";

function pascalCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function createCollectionRouter(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
  config?: RouteGeneratorConfig,
): CollectionRouter {
  const basePath = config?.basePath ?? "/api";
  const maxPageSize = config?.maxPageSize ?? 100;
  const defaultPageSize = config?.defaultPageSize ?? 10;
  const hooks = config?.hooks;
  const plural = collection.labels.plural;
  const tag = collection.labels.singular;
  const slug = collection.slug;

  const routes: RouteDefinition[] = [
    {
      method: "GET",
      path: `${basePath}/${slug}`,
      operationId: `list${pascalCase(slug)}`,
      summary: `List ${plural}`,
      tags: [tag],
      handler: applyMiddleware(
        createListHandler(collection, adapter, maxPageSize, defaultPageSize),
        hooks,
        collection,
      ),
    },
    {
      method: "GET",
      path: `${basePath}/${slug}/:id`,
      operationId: `get${pascalCase(slug)}`,
      summary: `Get a single ${tag}`,
      tags: [tag],
      handler: applyMiddleware(createGetHandler(collection, adapter), hooks, collection),
    },
    {
      method: "POST",
      path: `${basePath}/${slug}`,
      operationId: `create${pascalCase(slug)}`,
      summary: `Create a ${tag}`,
      tags: [tag],
      handler: applyMiddleware(createCreateHandler(collection, adapter), hooks, collection),
    },
    {
      method: "PATCH",
      path: `${basePath}/${slug}/:id`,
      operationId: `update${pascalCase(slug)}`,
      summary: `Update a ${tag}`,
      tags: [tag],
      handler: applyMiddleware(createUpdateHandler(collection, adapter), hooks, collection),
    },
    {
      method: "DELETE",
      path: `${basePath}/${slug}/:id`,
      operationId: `delete${pascalCase(slug)}`,
      summary: `Delete a ${tag}`,
      tags: [tag],
      handler: applyMiddleware(createDeleteHandler(collection, adapter), hooks, collection),
    },
    {
      method: "POST",
      path: `${basePath}/${slug}/bulk-delete`,
      operationId: `bulkDelete${pascalCase(slug)}`,
      summary: `Bulk delete ${plural}`,
      tags: [tag],
      handler: applyMiddleware(createBulkDeleteHandler(collection, adapter), hooks, collection),
    },
  ];

  if (collection.versions?.drafts) {
    routes.push(
      {
        method: "POST",
        path: `${basePath}/${slug}/:id/publish`,
        operationId: `publish${pascalCase(slug)}`,
        summary: `Publish a ${tag}`,
        tags: [tag],
        handler: applyMiddleware(createPublishHandler(collection, adapter), hooks, collection),
      },
      {
        method: "POST",
        path: `${basePath}/${slug}/:id/unpublish`,
        operationId: `unpublish${pascalCase(slug)}`,
        summary: `Unpublish a ${tag}`,
        tags: [tag],
        handler: applyMiddleware(createUnpublishHandler(collection, adapter), hooks, collection),
      },
    );
  }

  if (collection.versions?.softDelete) {
    routes.push({
      method: "POST",
      path: `${basePath}/${slug}/:id/restore`,
      operationId: `restore${pascalCase(slug)}`,
      summary: `Restore a soft-deleted ${tag}`,
      tags: [tag],
      handler: applyMiddleware(createRestoreHandler(collection, adapter), hooks, collection),
    });
  }

  if (collection.versions) {
    routes.push(
      {
        method: "GET",
        path: `${basePath}/${slug}/:id/versions`,
        operationId: `list${pascalCase(slug)}Versions`,
        summary: `List versions for a ${tag}`,
        tags: [tag],
        handler: applyMiddleware(createListVersionsHandler(collection, adapter), hooks, collection),
      },
      {
        method: "POST",
        path: `${basePath}/${slug}/:id/versions/:versionId/restore`,
        operationId: `restore${pascalCase(slug)}Version`,
        summary: `Restore a ${tag} to a previous version`,
        tags: [tag],
        handler: applyMiddleware(
          createRestoreVersionHandler(collection, adapter),
          hooks,
          collection,
        ),
      },
    );
  }

  return { routes };
}

export function createCollectionRouters(
  collections: CollectionDefinition[],
  adapter: DatabaseAdapter,
  config?: RouteGeneratorConfig,
): CollectionRouter[] {
  return collections.map((c) => createCollectionRouter(c, adapter, config));
}

export function createGlobalRouter(
  globalDef: GlobalDefinition,
  adapter: DatabaseAdapter,
  config?: RouteGeneratorConfig,
): CollectionRouter {
  const basePath = config?.basePath ?? "/api";
  const tag = globalDef.label;
  const slug = globalDef.slug;

  const routes: RouteDefinition[] = [
    {
      method: "GET",
      path: `${basePath}/globals/${slug}`,
      operationId: `getGlobal${pascalCase(slug)}`,
      summary: `Get ${tag}`,
      tags: ["Globals"],
      handler: createGlobalGetHandler(globalDef, adapter),
    },
    {
      method: "PUT",
      path: `${basePath}/globals/${slug}`,
      operationId: `upsertGlobal${pascalCase(slug)}`,
      summary: `Create or update ${tag}`,
      tags: ["Globals"],
      handler: createGlobalUpsertHandler(globalDef, adapter),
    },
  ];

  return { routes };
}

export function createGlobalRouters(
  globals: GlobalDefinition[],
  adapter: DatabaseAdapter,
  config?: RouteGeneratorConfig,
): CollectionRouter[] {
  return globals.map((g) => createGlobalRouter(g, adapter, config));
}
