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

async function populateRelation(
  record: Record<string, unknown>,
  fieldName: string,
  targetCollection: string,
  adapter: DatabaseAdapter,
): Promise<void> {
  const value = record[fieldName];
  if (value == null) return;
  const tableName = collectionTableName(targetCollection);
  if (typeof value === "string") {
    const related = await adapter.findOne(tableName, value);
    record[fieldName] = related ?? null;
  } else if (Array.isArray(value)) {
    const ids = value.map((v) => String(v));
    const result = await adapter.findMany(tableName, { where: { id: ids } });
    record[fieldName] = result.data;
  }
}

async function populateRelations(
  records: Record<string, unknown>[],
  populateFields: string[],
  collection: CollectionDefinition,
  adapter: DatabaseAdapter,
): Promise<void> {
  const relationFields = getRelationFields(collection);
  for (const record of records) {
    for (const rf of relationFields) {
      if (populateFields.includes(rf.name)) {
        await populateRelation(record, rf.name, rf.to, adapter);
      }
    }
  }
}

function errorResult(statusCode: number, message: string): RouteHandlerResult {
  return { statusCode, body: { error: message } };
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
      const tableName = collectionTableName(collection.slug);
      const result = await adapter.findMany(tableName, options);
      if (options.populate && result.data.length > 0) {
        await populateRelations(result.data, options.populate, collection, adapter);
      }
      return { statusCode: 200, body: result };
    } catch (e) {
      return errorResult(500, e instanceof Error ? e.message : "Internal server error");
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
    } catch (e) {
      return errorResult(500, e instanceof Error ? e.message : "Internal server error");
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
      const tableName = collectionTableName(collection.slug);
      const record = await adapter.create(tableName, parsed.data as Record<string, unknown>);
      return { statusCode: 201, body: record };
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        return {
          statusCode: 409,
          body: { error: "A record with this value already exists", code: "CONFLICT" },
        };
      }
      return errorResult(500, e instanceof Error ? e.message : "Internal server error");
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
      const tableName = collectionTableName(collection.slug);
      const record = await adapter.update(tableName, id, parsed.data as Record<string, unknown>);
      if (!record) return errorResult(404, "Not found");
      return { statusCode: 200, body: record };
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        return {
          statusCode: 409,
          body: { error: "A record with this value already exists", code: "CONFLICT" },
        };
      }
      return errorResult(500, e instanceof Error ? e.message : "Internal server error");
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
    } catch (e) {
      return errorResult(500, e instanceof Error ? e.message : "Internal server error");
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
      return errorResult(500, e instanceof Error ? e.message : "Internal server error");
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
      const deleted = await adapter.deleteMany(tableName, ids);
      return { statusCode: 200, body: { deleted } };
    } catch (e) {
      return errorResult(500, e instanceof Error ? e.message : "Internal server error");
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
      const deleted = await adapter.delete(tableName, id);
      if (!deleted) return errorResult(404, "Not found");
      return { statusCode: 200, body: { id, deleted: true } };
    } catch (e) {
      return errorResult(500, e instanceof Error ? e.message : "Internal server error");
    }
  };
}
