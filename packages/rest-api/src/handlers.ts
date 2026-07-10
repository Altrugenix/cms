import type { DatabaseAdapter, QueryOptions } from "@altrugenix/database";
import type {
  CollectionDefinition,
  FieldDefinition,
  RelationField,
  GlobalDefinition,
} from "@altrugenix/types";
import { collectionToCreateSchema, collectionToUpdateSchema } from "@altrugenix/validation";
import type { RouteHandler, RouteHandlerContext, RouteHandlerResult } from "./types.js";

function collectionTableName(slug: string): string {
  return `__cms_${slug.replace(/-/g, "_")}`;
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("UNIQUE constraint failed");
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
  return Object.keys(sort).length > 0 ? sort : undefined;
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
    sort: parseSort(ctx.query.sort),
    where: parseWhere(ctx.query),
    select: parseSelect(ctx.query.select),
    populate: parsePopulate(ctx.query.populate),
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
    if (!record) continue;
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
    if (!record) continue;
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
  if (relationFields.length === 0 || records.length === 0) return Promise.resolve();

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
  return { statusCode, body: { error: message } };
}

function hasDrafts(collection: CollectionDefinition): boolean {
  return collection.versions?.drafts === true;
}

function hasSoftDelete(collection: CollectionDefinition): boolean {
  return collection.versions?.softDelete === true;
}

function hasScheduledPublishing(collection: CollectionDefinition): boolean {
  return collection.versions?.scheduledPublishing === true;
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
        _status: "published",
        _publishedAt: new Date().toISOString(),
      } as Record<string, unknown>);
      if (!record) return errorResult(404, "Not found");
      return { statusCode: 200, body: record };
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
        _status: "draft",
        _publishedAt: null,
        _publishedBy: null,
      } as Record<string, unknown>);
      if (!record) return errorResult(404, "Not found");
      return { statusCode: 200, body: record };
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
      const tableName = collectionTableName(collection.slug);
      const result = await adapter.findMany(tableName, options);
      if (options.populate && result.data.length > 0) {
        await populateRelations(result.data, options.populate, collection, adapter);
      }
      return { statusCode: 200, body: result };
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
      const populate = parsePopulate(ctx.query.populate);
      if (populate) {
        await populateRelations([record], populate, collection, adapter);
      }
      return { statusCode: 200, body: record };
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
          statusCode: 400,
          body: { error: "Validation failed", details: parsed.error.issues },
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
      return { statusCode: 201, body: record };
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        return {
          statusCode: 409,
          body: { error: "A record with this value already exists", code: "CONFLICT" },
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
          statusCode: 400,
          body: { error: "Validation failed", details: parsed.error.issues },
        };
      }
      const data = parsed.data as Record<string, unknown>;
      if (hasDrafts(collection)) {
        const { _status, _publishedAt, _publishedBy, ...rest } = data;
        const tableName = collectionTableName(collection.slug);
        const record = await adapter.update(tableName, id, rest);
        if (!record) return errorResult(404, "Not found");
        return { statusCode: 200, body: record };
      }
      const tableName = collectionTableName(collection.slug);
      const record = await adapter.update(tableName, id, data);
      if (!record) return errorResult(404, "Not found");
      return { statusCode: 200, body: record };
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        return {
          statusCode: 409,
          body: { error: "A record with this value already exists", code: "CONFLICT" },
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
      return { statusCode: 200, body: record ?? {} };
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
      return { statusCode: 200, body: record };
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        return {
          statusCode: 409,
          body: { error: "A record with this value already exists", code: "CONFLICT" },
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
        return { statusCode: 200, body: { deleted: ids.length } };
      }
      const deleted = await adapter.deleteMany(tableName, ids);
      return { statusCode: 200, body: { deleted } };
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
        return { statusCode: 200, body: { id, deleted: true } };
      }
      const deleted = await adapter.delete(tableName, id);
      if (!deleted) return errorResult(404, "Not found");
      return { statusCode: 200, body: { id, deleted: true } };
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
      return { statusCode: 200, body: record };
    } catch {
      return errorResult(500, "Internal server error");
    }
  };
}
