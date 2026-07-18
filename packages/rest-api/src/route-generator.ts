import type { DatabaseAdapter } from "@arche-cms/database";
import type { CollectionDefinition, GlobalDefinition } from "@arche-cms/types";

import type { RouteDefinition, RouteGeneratorConfig, CollectionRouter } from "./types.js";

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
import { applyMiddleware } from "./middleware.js";

export function pascalCase(slug: string): string {
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
      handler: applyMiddleware(
        createListHandler(collection, adapter, maxPageSize, defaultPageSize),
        hooks,
        collection,
      ),
      method: "GET",
      operationId: `list${pascalCase(slug)}`,
      path: `${basePath}/${slug}`,
      summary: `List ${plural}`,
      tags: [tag],
    },
    {
      handler: applyMiddleware(createGetHandler(collection, adapter), hooks, collection),
      method: "GET",
      operationId: `get${pascalCase(slug)}`,
      path: `${basePath}/${slug}/:id`,
      summary: `Get a single ${tag}`,
      tags: [tag],
    },
    {
      handler: applyMiddleware(createCreateHandler(collection, adapter), hooks, collection),
      method: "POST",
      operationId: `create${pascalCase(slug)}`,
      path: `${basePath}/${slug}`,
      summary: `Create a ${tag}`,
      tags: [tag],
    },
    {
      handler: applyMiddleware(createUpdateHandler(collection, adapter), hooks, collection),
      method: "PATCH",
      operationId: `update${pascalCase(slug)}`,
      path: `${basePath}/${slug}/:id`,
      summary: `Update a ${tag}`,
      tags: [tag],
    },
    {
      handler: applyMiddleware(createDeleteHandler(collection, adapter), hooks, collection),
      method: "DELETE",
      operationId: `delete${pascalCase(slug)}`,
      path: `${basePath}/${slug}/:id`,
      summary: `Delete a ${tag}`,
      tags: [tag],
    },
    {
      handler: applyMiddleware(createBulkDeleteHandler(collection, adapter), hooks, collection),
      method: "POST",
      operationId: `bulkDelete${pascalCase(slug)}`,
      path: `${basePath}/${slug}/bulk-delete`,
      summary: `Bulk delete ${plural}`,
      tags: [tag],
    },
  ];

  if (collection.versions?.drafts) {
    routes.push(
      {
        handler: applyMiddleware(createPublishHandler(collection, adapter), hooks, collection),
        method: "POST",
        operationId: `publish${pascalCase(slug)}`,
        path: `${basePath}/${slug}/:id/publish`,
        summary: `Publish a ${tag}`,
        tags: [tag],
      },
      {
        handler: applyMiddleware(createUnpublishHandler(collection, adapter), hooks, collection),
        method: "POST",
        operationId: `unpublish${pascalCase(slug)}`,
        path: `${basePath}/${slug}/:id/unpublish`,
        summary: `Unpublish a ${tag}`,
        tags: [tag],
      },
    );
  }

  if (collection.versions?.softDelete) {
    routes.push({
      handler: applyMiddleware(createRestoreHandler(collection, adapter), hooks, collection),
      method: "POST",
      operationId: `restore${pascalCase(slug)}`,
      path: `${basePath}/${slug}/:id/restore`,
      summary: `Restore a soft-deleted ${tag}`,
      tags: [tag],
    });
  }

  if (collection.versions) {
    routes.push(
      {
        handler: applyMiddleware(createListVersionsHandler(collection, adapter), hooks, collection),
        method: "GET",
        operationId: `list${pascalCase(slug)}Versions`,
        path: `${basePath}/${slug}/:id/versions`,
        summary: `List versions for a ${tag}`,
        tags: [tag],
      },
      {
        handler: applyMiddleware(
          createRestoreVersionHandler(collection, adapter),
          hooks,
          collection,
        ),
        method: "POST",
        operationId: `restore${pascalCase(slug)}Version`,
        path: `${basePath}/${slug}/:id/versions/:versionId/restore`,
        summary: `Restore a ${tag} to a previous version`,
        tags: [tag],
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

  const hooks = config?.hooks;

  const routes: RouteDefinition[] = [
    {
      handler: applyMiddleware(createGlobalGetHandler(globalDef, adapter), hooks),
      method: "GET",
      operationId: `getGlobal${pascalCase(slug)}`,
      path: `${basePath}/globals/${slug}`,
      summary: `Get ${tag}`,
      tags: ["Globals"],
    },
    {
      handler: applyMiddleware(createGlobalUpsertHandler(globalDef, adapter), hooks),
      method: "PUT",
      operationId: `upsertGlobal${pascalCase(slug)}`,
      path: `${basePath}/globals/${slug}`,
      summary: `Create or update ${tag}`,
      tags: ["Globals"],
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
