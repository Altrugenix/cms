import type { DatabaseAdapter, QueryOptions } from "@arche-cms/database";
import type {
  CollectionDefinition,
  FieldDefinition,
  RelationField,
  GlobalDefinition,
} from "@arche-cms/types";

import { collectionToCreateSchema, collectionToUpdateSchema } from "@arche-cms/validation";

import type { RouteHandler, RouteHandlerContext, RouteHandlerResult } from "./types.js";

function collectionTableName(slug: string): string {
  return `__cms_${slug.replace(/-/g, "_")}`;
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("UNIQUE constraint failed") ||
      err.message.includes("duplicate key value violates unique constraint"))
  );
}

function parseLimit(raw: unknown, max = 100, def = 10): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
}

function parseOffset(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseSort(raw: unknown): Record<string, "asc" | "desc"> | undefined {
  if (typeof raw !== "string") return undefined;
  const parts = raw.split(",");
  const sort: Record<string, "asc" | "desc"> = {};
  for (const part of parts) {
    const colon = part.lastIndexOf(":");
    if (colon === -1) {
      sort[part] = "asc";
    } else {
      const field = part.slice(0, colon);
      const dir = part.slice(colon + 1);
      sort[field] = dir === "desc" ? "desc" : "asc";
    }
  }
  return sort;
}

function validateQueryParams(query: Record<string, string | string[] | undefined>): string | null {
  if (query.limit !== undefined) {
    const n = Number(query.limit);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      return "limit must be a positive integer";
    }
  }
  if (query.offset !== undefined) {
    const n = Number(query.offset);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      return "offset must be a non-negative integer";
    }
  }
  if (query.sort !== undefined && typeof query.sort === "string" && query.sort.trim() === "") {
    return "sort must be a non-empty string";
  }
  return null;
}

function parseSelect(raw: unknown): string[] | undefined {
  if (typeof raw !== "string") return undefined;
  const fields = raw
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  return fields.length > 0 ? fields : undefined;
}

function parsePopulate(raw: unknown): string[] | undefined {
  if (typeof raw !== "string") return undefined;
  const fields = raw
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  return fields.length > 0 ? fields : undefined;
}

function parseWhere(
  query: Record<string, string | string[] | undefined>,
): Record<string, unknown> | undefined {
  const where: Record<string, unknown> = {};
  let hasWhere = false;
  for (const [key, value] of Object.entries(query)) {
    if (["limit", "offset", "sort", "select", "populate"].includes(key)) continue;
    if (key.startsWith("where[")) {
      const innerKey = key.slice(6, -1);
      where[innerKey] = value;
      hasWhere = true;
    }
  }
  return hasWhere ? where : undefined;
}

function queryOptions(
  ctx: RouteHandlerContext,
  maxPageSize: number,
  defaultPageSize: number,
): QueryOptions {
  return {
    limit: parseLimit(ctx.query.limit, maxPageSize, defaultPageSize),
    offset: parseOffset(ctx.query.offset),
    populate: parsePopulate(ctx.query.populate),
    select: parseSelect(ctx.query.select),
    sort: parseSort(ctx.query.sort),
    where: parseWhere(ctx.query),
  };
}

function isRelationField(field: FieldDefinition): field is RelationField {
  return field.type === "relation";
}

function getRelationFields(collection: CollectionDefinition): RelationField[] {
  return collection.fields.filter(isRelationField);
}

type IdCollection = { allIds: Set<string>; isArrayMap: Map<number, boolean> };

function collectRelationIds(records: Record<string, unknown>[], field: string): IdCollection {
  const allIds = new Set<string>();
  const isArrayMap = new Map<number, boolean>();
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    /* v8 ignore next 2 -- defensive, adapter never returns nulls */
    if (record == null) continue;
    const value = record[field];
    if (value == null) continue;
    if (Array.isArray(value)) {
      isArrayMap.set(i, true);
      for (const v of value as unknown[]) allIds.add(String(v));
    } else {
      isArrayMap.set(i, false);
      allIds.add(String(value));
    }
  }
  return { allIds, isArrayMap };
}

function attachRelatedRecords(
  records: Record<string, unknown>[],
  field: string,
  relatedMap: Map<string, Record<string, unknown>>,
  isArrayMap: Map<number, boolean>,
): void {
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    /* v8 ignore next 2 -- defensive, adapter never returns nulls */
    if (record == null) continue;
    const value = record[field];
    if (value == null) continue;
    record[field] =
      isArrayMap.get(i) === true
        ? (value as unknown[]).map((v: unknown) => relatedMap.get(String(v)) ?? null)
        : (relatedMap.get(String(value)) ?? null);
  }
}

function populateRelations(
  records: Record<string, unknown>[],
  populateFields: string[],
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): Promise<void> {
  const relationFields = getRelationFields(collection).filter((rf) =>
    populateFields.includes(rf.name),
  );
  if (relationFields.length === 0) return Promise.resolve();

  return Promise.all(
    relationFields.map(async (rf) => {
      const tableName = collectionTableName(rf.to);
      const { allIds, isArrayMap } = collectRelationIds(records, rf.name);
      if (allIds.size === 0) return;

      const { data: relatedRecords } = await adapter.findMany(tableName, {
        where: { id: [...allIds] },
      });
      const relatedMap = new Map<string, Record<string, unknown>>();
      for (const row of relatedRecords) {
        relatedMap.set(String(row.id), row);
      }

      attachRelatedRecords(records, rf.name, relatedMap, isArrayMap);
    }),
  ).then(() => undefined);
}

function errorResult(statusCode: number, message: string): RouteHandlerResult {
  return { body: { error: message }, statusCode };
}

function hasDrafts(collection: CollectionDefinition): boolean {
  return collection.versions?.drafts === true;
}

const VERSIONS_TABLE = "__cms_versions";

async function saveVersion(
  adapter: DatabaseAdapter,
  collection: CollectionDefinition,
  entryId: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const existing = await adapter.findMany(VERSIONS_TABLE, {
      limit: 1,
      sort: { version: "desc" },
      where: { collection: collection.slug, entryId },
    });
    const nextVersion =
      existing.total > 0
        ? ((existing.data[0] as Record<string, unknown>).version as number) + 1
        : 1;
    await adapter.create(VERSIONS_TABLE, {
      collection: collection.slug,
      createdAt: new Date().toISOString(),
      data: JSON.stringify(data),
      entryId,
      version: nextVersion,
    });
    const maxPerDoc = collection.versions?.maxPerDoc;
    if (maxPerDoc) {
      const allVersions = await adapter.findMany(VERSIONS_TABLE, {
        sort: { version: "desc" },
        where: { collection: collection.slug, entryId },
      });
      if (allVersions.total > maxPerDoc) {
        const toDelete = allVersions.data
          .slice(maxPerDoc)
          .map((r) => String((r as Record<string, unknown>).id));
        if (toDelete.length > 0) {
          await adapter.deleteMany(VERSIONS_TABLE, toDelete);
        }
      }
    }
  } catch {
    // Silently fail — version storage should not block the main operation
  }
}

function hasSoftDelete(collection: CollectionDefinition): boolean {
  return collection.versions?.softDelete === true;
}

function hasScheduledPublishing(collection: CollectionDefinition): boolean {
  return collection.versions?.scheduledPublishing === true;
}

function defaultLocale(collection: CollectionDefinition): string {
  return collection.localization?.defaultLocale ?? "en";
}

function localizedFields(collection: CollectionDefinition): FieldDefinition[] {
  return collection.fields.filter((f) => f.localized);
}

function filterLocale(data: unknown, locale: string | undefined, fallback: string): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (locale && record[String(locale)] !== undefined) return record[String(locale)];
    if (record[fallback] !== undefined) return record[fallback];
    const keys = Object.keys(record);
    if (keys.length > 0) return record[String(keys[0])];
  }
  return data;
}

function applyLocaleToRecord(
  record: Record<string, unknown>,
  locale: string | undefined,
  fallback: string,
  fields: FieldDefinition[],
): Record<string, unknown> {
  if (!locale) return record;
  const result = { ...record };
  for (const field of fields) {
    if (field.localized) {
      result[field.name] = filterLocale(result[field.name], locale, fallback);
    }
  }
  return result;
}

export function createPublishHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      const { id } = ctx.params;
      if (!id) return errorResult(400, "Missing id parameter");
      const tableName = collectionTableName(collection.slug);
      const record = await adapter.update(tableName, id, {
        _publishedAt: new Date().toISOString(),
        _status: "published",
      } as Record<string, unknown>);
      if (!record) return errorResult(404, "Not found");
      return { body: record, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createUnpublishHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      const { id } = ctx.params;
      if (!id) return errorResult(400, "Missing id parameter");
      const tableName = collectionTableName(collection.slug);
      const record = await adapter.update(tableName, id, {
        _publishedAt: null,
        _publishedBy: null,
        _status: "draft",
      } as Record<string, unknown>);
      if (!record) return errorResult(404, "Not found");
      return { body: record, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createListHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
  maxPageSize: number,
  defaultPageSize: number,
): RouteHandler {
  return async (ctx) => {
    try {
      const validationError = validateQueryParams(ctx.query);
      if (validationError) return errorResult(400, validationError);
      const options = queryOptions(ctx, maxPageSize, defaultPageSize);
      if (hasSoftDelete(collection)) {
        const showDeleted = ctx.query.deleted === "true" || ctx.query.deleted === "only";
        if (!showDeleted) {
          options.where = { ...options.where, _deletedAt: null };
        }
      }
      if (hasDrafts(collection) && !options.where?._status) {
        options.where = { ...options.where, _status: "published" };
      }
      const locale = typeof ctx.query.locale === "string" ? ctx.query.locale : undefined;
      const lFields = localizedFields(collection);
      const tableName = collectionTableName(collection.slug);
      const result = await adapter.findMany(tableName, options);
      if (lFields.length > 0) {
        const fallback = defaultLocale(collection);
        result.data = result.data.map((r) =>
          applyLocaleToRecord(r as Record<string, unknown>, locale, fallback, lFields),
        ) as typeof result.data;
      }
      if (options.populate && result.data.length > 0) {
        await populateRelations(result.data, options.populate, collection, adapter);
      }
      return { body: result, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createGetHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      const { id } = ctx.params;
      if (!id) return errorResult(400, "Missing id parameter");
      const tableName = collectionTableName(collection.slug);
      const record = await adapter.findOne(tableName, id, {
        select: parseSelect(ctx.query.select),
      });
      if (!record) return errorResult(404, "Not found");
      const locale = typeof ctx.query.locale === "string" ? ctx.query.locale : undefined;
      if (locale) {
        const lFields = localizedFields(collection);
        if (lFields.length > 0) {
          Object.assign(
            record,
            applyLocaleToRecord(
              record as Record<string, unknown>,
              locale,
              defaultLocale(collection),
              lFields,
            ),
          );
        }
      }
      const populate = parsePopulate(ctx.query.populate);
      if (populate) {
        await populateRelations([record], populate, collection, adapter);
      }
      return { body: record, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createCreateHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      if (!ctx.body || typeof ctx.body !== "object") {
        return errorResult(400, "Request body is required");
      }
      const schema = collectionToCreateSchema(collection);
      const parsed = schema.safeParse(ctx.body);
      if (!parsed.success) {
        return {
          body: { details: parsed.error.issues, error: "Validation failed" },
          statusCode: 400,
        };
      }
      const data = parsed.data as Record<string, unknown>;
      if (hasDrafts(collection)) {
        data._status = data._status ?? "draft";
        if (data._status === "published") {
          data._publishedAt = new Date().toISOString();
        }
        if (hasScheduledPublishing(collection) && data._publishAt && data._status !== "published") {
          data._status = "draft";
        }
      }
      const tableName = collectionTableName(collection.slug);
      const record = await adapter.create(tableName, data);
      if (record) {
        await saveVersion(
          adapter,
          collection,
          String(record.id),
          record as Record<string, unknown>,
        );
      }
      return { body: record, statusCode: 201 };
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        return {
          body: { code: "CONFLICT", error: "A record with this value already exists" },
          statusCode: 409,
        };
      }
      return errorResult(500, "Internal server error");
    }
  };
}

export function createUpdateHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      const { id } = ctx.params;
      if (!id) return errorResult(400, "Missing id parameter");
      if (!ctx.body || typeof ctx.body !== "object") {
        return errorResult(400, "Request body is required");
      }
      const schema = collectionToUpdateSchema(collection);
      const parsed = schema.safeParse(ctx.body);
      if (!parsed.success) {
        return {
          body: { details: parsed.error.issues, error: "Validation failed" },
          statusCode: 400,
        };
      }
      const data = parsed.data as Record<string, unknown>;
      let record: Record<string, unknown> | null;
      if (hasDrafts(collection)) {
        const { _publishedAt, _publishedBy, _status, ...rest } = data;
        const tableName = collectionTableName(collection.slug);
        record = await adapter.update(tableName, id, rest);
        if (!record) return errorResult(404, "Not found");
        await saveVersion(adapter, collection, id, record);
        return { body: record, statusCode: 200 };
      }
      const tableName = collectionTableName(collection.slug);
      record = await adapter.update(tableName, id, data);
      if (!record) return errorResult(404, "Not found");
      await saveVersion(adapter, collection, id, record);
      return { body: record, statusCode: 200 };
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        return {
          body: { code: "CONFLICT", error: "A record with this value already exists" },
          statusCode: 409,
        };
      }
      return errorResult(500, "Internal server error");
    }
  };
}

export function createGlobalGetHandler(
  globalDef: GlobalDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async () => {
    try {
      const tableName = collectionTableName(globalDef.slug);
      const record = await adapter.findOne(tableName, "1");
      return { body: record ?? {}, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createGlobalUpsertHandler(
  globalDef: GlobalDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      if (!ctx.body || typeof ctx.body !== "object") {
        return errorResult(400, "Request body is required");
      }
      const tableName = collectionTableName(globalDef.slug);
      const existing = await adapter.findOne(tableName, "1");
      let record: Record<string, unknown>;
      if (existing) {
        record = (await adapter.update(tableName, "1", ctx.body as Record<string, unknown>)) ?? {};
      } else {
        record = await adapter.create(tableName, {
          id: 1,
          ...(ctx.body as Record<string, unknown>),
        });
      }
      return { body: record, statusCode: 200 };
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        return {
          body: { code: "CONFLICT", error: "A record with this value already exists" },
          statusCode: 409,
        };
      }
      return errorResult(500, "Internal server error");
    }
  };
}

export function createBulkDeleteHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      if (
        !ctx.body ||
        typeof ctx.body !== "object" ||
        !Array.isArray((ctx.body as Record<string, unknown>).ids)
      ) {
        return errorResult(400, "Request body must contain an ids array");
      }
      const ids = (ctx.body as Record<string, unknown>).ids as string[];
      if (ids.length === 0) {
        return errorResult(400, "ids array must not be empty");
      }
      const tableName = collectionTableName(collection.slug);
      if (hasSoftDelete(collection)) {
        for (const id of ids) {
          await adapter.update(tableName, id, {
            _deletedAt: new Date().toISOString(),
          } as Record<string, unknown>);
        }
        return { body: { deleted: ids.length }, statusCode: 200 };
      }
      const deleted = await adapter.deleteMany(tableName, ids);
      return { body: { deleted }, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createBulkPublishHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      if (
        !ctx.body ||
        typeof ctx.body !== "object" ||
        !Array.isArray((ctx.body as Record<string, unknown>).ids)
      ) {
        return errorResult(400, "Request body must contain an ids array");
      }
      const ids = (ctx.body as Record<string, unknown>).ids as string[];
      if (ids.length === 0) {
        return errorResult(400, "ids array must not be empty");
      }
      const tableName = collectionTableName(collection.slug);
      const now = new Date().toISOString();
      for (const id of ids) {
        await adapter.update(tableName, id, {
          _publishedAt: now,
          _status: "published",
        } as Record<string, unknown>);
      }
      return { body: { published: ids.length }, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createBulkUnpublishHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      if (
        !ctx.body ||
        typeof ctx.body !== "object" ||
        !Array.isArray((ctx.body as Record<string, unknown>).ids)
      ) {
        return errorResult(400, "Request body must contain an ids array");
      }
      const ids = (ctx.body as Record<string, unknown>).ids as string[];
      if (ids.length === 0) {
        return errorResult(400, "ids array must not be empty");
      }
      const tableName = collectionTableName(collection.slug);
      for (const id of ids) {
        await adapter.update(tableName, id, {
          _publishedAt: null,
          _publishedBy: null,
          _status: "draft",
        } as Record<string, unknown>);
      }
      return { body: { unpublished: ids.length }, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createDeleteHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      const { id } = ctx.params;
      if (!id) return errorResult(400, "Missing id parameter");
      const tableName = collectionTableName(collection.slug);
      if (hasSoftDelete(collection)) {
        const record = await adapter.update(tableName, id, {
          _deletedAt: new Date().toISOString(),
        } as Record<string, unknown>);
        if (!record) return errorResult(404, "Not found");
        return { body: { deleted: true, id }, statusCode: 200 };
      }
      const deleted = await adapter.delete(tableName, id);
      if (!deleted) return errorResult(404, "Not found");
      return { body: { deleted: true, id }, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createRestoreHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      const { id } = ctx.params;
      if (!id) return errorResult(400, "Missing id parameter");
      const tableName = collectionTableName(collection.slug);
      const record = await adapter.update(tableName, id, {
        _deletedAt: null,
      } as Record<string, unknown>);
      if (!record) return errorResult(404, "Not found");
      return { body: record, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createListVersionsHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      const { id } = ctx.params;
      if (!id) return errorResult(400, "Missing id parameter");
      const result = await adapter.findMany(VERSIONS_TABLE, {
        sort: { version: "desc" },
        where: { collection: collection.slug, entryId: id },
      });
      return { body: result, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}

export function createRestoreVersionHandler(
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): RouteHandler {
  return async (ctx) => {
    try {
      const { id, versionId } = ctx.params;
      if (!id || !versionId) return errorResult(400, "Missing id or versionId parameter");
      const tableName = collectionTableName(collection.slug);

      const records = await adapter.findMany(VERSIONS_TABLE, {
        limit: 1,
        where: { collection: collection.slug, entryId: id, id: Number(versionId) },
      });
      if (records.total === 0) return errorResult(404, "Version not found");

      const versionData = JSON.parse(
        (records.data[0] as Record<string, unknown>).data as string,
      ) as Record<string, unknown>;

      delete versionData.id;
      delete versionData._status;
      delete versionData._deletedAt;
      delete versionData._deletedBy;
      delete versionData._publishAt;

      const record = await adapter.update(tableName, id, versionData);
      if (!record) return errorResult(404, "Not found");
      await saveVersion(adapter, collection, id, record);
      return { body: record, statusCode: 200 };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}
