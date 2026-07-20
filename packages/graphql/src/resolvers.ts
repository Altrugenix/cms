import type { DatabaseAdapter, QueryOptions } from "@arche-cms/database";
import type {
  CollectionDefinition,
  FieldDefinition,
  GlobalDefinition,
  RelationField,
} from "@arche-cms/types";

import { createMutationPayloadSchema, updateMutationPayloadSchema } from "@arche-cms/validation";

import { pascalCase, camelCase } from "./types.js";

function collectionTableName(slug: string): string {
  return `__cms_${slug.replace(/-/g, "_")}`;
}

function isRelationField(field: FieldDefinition): field is RelationField {
  return field.type === "relation";
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
  lFields: FieldDefinition[],
): Record<string, unknown> {
  if (!locale) return record;
  const result = { ...record };
  for (const field of lFields) {
    result[field.name] = filterLocale(result[field.name], locale, fallback);
  }
  return result;
}

function normalizeLocaleData(
  data: Record<string, unknown>,
  collection: CollectionDefinition,
): Record<string, unknown> {
  const def = defaultLocale(collection);
  for (const field of localizedFields(collection)) {
    const val = data[field.name];
    if (val !== undefined && val !== null && (typeof val !== "object" || Array.isArray(val))) {
      data[field.name] = { [def]: val };
    }
  }
  return data;
}

function hasDrafts(collection: CollectionDefinition): boolean {
  return collection.versions?.drafts === true;
}

function hasSoftDelete(collection: CollectionDefinition): boolean {
  return collection.versions?.softDelete === true;
}

function generateTypeResolvers(
  collection: CollectionDefinition,
  collections: CollectionDefinition[],
  adapter: DatabaseAdapter,
): Record<string, (parent: Record<string, unknown>) => unknown> | undefined {
  const relationFields = collection.fields.filter(isRelationField);
  if (relationFields.length === 0) return undefined;

  const typeResolvers: Record<string, (parent: Record<string, unknown>) => unknown> = {};

  for (const rf of relationFields) {
    const targetCollection = collections.find((c) => c.slug === rf.to);
    if (!targetCollection) continue;

    const targetTable = collectionTableName(rf.to);

    typeResolvers[rf.name] = async (parent: Record<string, unknown>) => {
      const value = parent[rf.name];
      if (value == null) return null;

      if (Array.isArray(value)) {
        const ids = value.map((v) => String(v));
        const result = await adapter.findMany(targetTable, { where: { id: ids } });
        return result.data.map((r) => ({ ...r, id: String(r.id) }));
      }

      const record = await adapter.findOne(targetTable, String(value));
      return record ? { ...record, id: String(record.id) } : null;
    };
  }

  return Object.keys(typeResolvers).length > 0 ? typeResolvers : undefined;
}

export function generateResolvers(
  collections: CollectionDefinition[],
  adapter: DatabaseAdapter,
  globals?: GlobalDefinition[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, Record<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryFields: Record<string, any> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mutationFields: Record<string, any> = {};

  for (const collection of collections) {
    const name = pascalCase(collection.slug);
    const table = collectionTableName(collection.slug);

    // fallow-ignore-next-line complexity
    queryFields[`list${name}`] = async (_parent: unknown, args: Record<string, unknown>) => {
      const options: QueryOptions = {};
      const limit = typeof args.limit === "number" ? Math.min(args.limit, 100) : 10;
      const offset = typeof args.offset === "number" ? args.offset : 0;

      options.limit = limit;
      options.offset = offset;

      if (args.sort) {
        const sortStr = args.sort as string;
        const lastUnderscore = sortStr.lastIndexOf("_");
        if (lastUnderscore !== -1) {
          const field = sortStr.slice(0, lastUnderscore);
          const dir = sortStr.slice(lastUnderscore + 1);
          options.sort = { [field]: dir === "desc" ? "desc" : "asc" };
        }
      }

      if (args.filter) {
        options.where = args.filter as Record<string, unknown>;
      }

      if (hasDrafts(collection) && !options.where?._status) {
        options.where = { ...options.where, _status: "published" };
      }

      if (hasSoftDelete(collection)) {
        options.where = { ...options.where, _deletedAt: null };
      }

      const locale = typeof args.locale === "string" ? args.locale : undefined;
      const lFields = localizedFields(collection);
      const result = await adapter.findMany(table, options);
      const data = result.data.map((row) => {
        const r = { ...row, id: String(row.id) };
        if (lFields.length > 0) {
          Object.assign(r, applyLocaleToRecord(r, locale, defaultLocale(collection), lFields));
        }
        return r;
      });
      return { data, limit, offset, total: result.total };
    };

    queryFields[camelCase(collection.slug)] = async (
      _parent: unknown,
      args: Record<string, unknown>,
    ) => {
      const row = await adapter.findOne(table, args.id as string);
      if (!row) return null;
      const r = { ...row, id: String(row.id) };
      const locale = typeof args.locale === "string" ? args.locale : undefined;
      if (locale) {
        const lFields = localizedFields(collection);
        if (lFields.length > 0) {
          Object.assign(r, applyLocaleToRecord(r, locale, defaultLocale(collection), lFields));
        }
      }
      return r;
    };

    mutationFields[`create${name}`] = async (_parent: unknown, args: Record<string, unknown>) => {
      const schema = createMutationPayloadSchema(collection);
      const result = schema.safeParse(args.data);
      if (!result.success) {
        const message = result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new Error(`Validation failed: ${message}`);
      }
      const data = normalizeLocaleData(result.data as Record<string, unknown>, collection);
      const row = await adapter.create(table, data);
      return { ...row, id: String(row.id) };
    };

    mutationFields[`update${name}`] = async (_parent: unknown, args: Record<string, unknown>) => {
      const schema = updateMutationPayloadSchema(collection);
      const result = schema.safeParse(args.data);
      if (!result.success) {
        const message = result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new Error(`Validation failed: ${message}`);
      }
      const data = normalizeLocaleData(result.data as Record<string, unknown>, collection);
      const row = await adapter.update(table, args.id as string, data);
      if (!row) throw new Error(`Not found: ${collection.slug} with id ${args.id}`);
      return { ...row, id: String(row.id) };
    };

    mutationFields[`delete${name}`] = async (_parent: unknown, args: Record<string, unknown>) => {
      return adapter.delete(table, args.id as string);
    };
  }

  if (globals) {
    for (const global of globals) {
      const name = pascalCase(global.slug);
      const table = collectionTableName(global.slug);

      queryFields[camelCase(global.slug)] = async () => {
        const record = await adapter.findOne(table, "1");
        return record ?? {};
      };

      mutationFields[`update${name}`] = async (_parent: unknown, args: Record<string, unknown>) => {
        const data = args.data as Record<string, unknown>;
        const existing = await adapter.findOne(table, "1");
        let record: Record<string, unknown>;
        if (existing) {
          record = (await adapter.update(table, "1", data)) ?? {};
        } else {
          record = await adapter.create(table, { id: 1, ...data });
        }
        return record;
      };
    }
  }

  const resolvers: Record<string, Record<string, unknown>> = {
    Mutation: mutationFields,
    Query: queryFields,
  };

  for (const collection of collections) {
    const name = pascalCase(collection.slug);
    const typeResolvers = generateTypeResolvers(collection, collections, adapter);
    if (typeResolvers) {
      resolvers[name] = typeResolvers;
    }
  }

  return resolvers;
}
