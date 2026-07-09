import type { DatabaseAdapter, QueryOptions } from "@altrugenix/database";
import type { CollectionDefinition, FieldDefinition, RelationField } from "@altrugenix/types";
import { createMutationPayloadSchema, updateMutationPayloadSchema } from "@altrugenix/validation";
import { pascalCase } from "./types.js";

function collectionTableName(slug: string): string {
  return `__cms_${slug.replace(/-/g, "_")}`;
}

function isRelationField(field: FieldDefinition): field is RelationField {
  return field.type === "relation";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, Record<string, any>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryFields: Record<string, any> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mutationFields: Record<string, any> = {};

  for (const collection of collections) {
    const name = pascalCase(collection.slug);
    const table = collectionTableName(collection.slug);

    queryFields[`list${name}`] = async (_parent: unknown, args: Record<string, unknown>) => {
      const options: QueryOptions = {};

      if (typeof args.limit === "number") {
        options.limit = Math.min(args.limit, 100);
      } else {
        options.limit = 10;
      }

      if (typeof args.offset === "number") {
        options.offset = args.offset;
      }

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

      const result = await adapter.findMany(table, options);
      return result.data.map((row) => ({ ...row, id: String(row.id) }));
    };

    queryFields[collection.slug] = async (_parent: unknown, args: Record<string, unknown>) => {
      const row = await adapter.findOne(table, args.id as string);
      if (!row) return null;
      return { ...row, id: String(row.id) };
    };

    mutationFields[`create${name}`] = async (_parent: unknown, args: Record<string, unknown>) => {
      const schema = createMutationPayloadSchema(collection);
      const parsed = schema.parse(args.data);
      const row = await adapter.create(table, parsed as Record<string, unknown>);
      return { ...row, id: String(row.id) };
    };

    mutationFields[`update${name}`] = async (_parent: unknown, args: Record<string, unknown>) => {
      const schema = updateMutationPayloadSchema(collection);
      const parsed = schema.parse(args.data);
      const row = await adapter.update(table, args.id as string, parsed as Record<string, unknown>);
      if (!row) throw new Error(`Not found: ${collection.slug} with id ${args.id}`);
      return { ...row, id: String(row.id) };
    };

    mutationFields[`delete${name}`] = async (_parent: unknown, args: Record<string, unknown>) => {
      return adapter.delete(table, args.id as string);
    };
  }

  const resolvers: Record<string, Record<string, unknown>> = {
    Query: queryFields,
    Mutation: mutationFields,
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
