import type { CollectionDefinition, FieldDefinition } from "@arche-cms/types";

import type { RouteDefinition } from "./types.js";

import { pascalCase } from "./route-generator.js";

const SIMPLE_OPENAPI_TYPES: Record<string, Record<string, unknown> | undefined> = {
  array: { items: { properties: {}, type: "object" }, type: "array" },
  boolean: { type: "boolean" },
  checkbox: { type: "boolean" },
  color: { format: "color", type: "string" },
  component: { properties: {}, type: "object" },
  date: { format: "date", type: "string" },
  datetime: { format: "date-time", type: "string" },
  dynamicZone: { items: { type: "object" }, type: "array" },
  email: { format: "email", type: "string" },
  group: { properties: {}, type: "object" },
  json: { type: "object" },
  media: { description: "Media file ID reference", type: "string" },
  multiSelect: { items: { type: "string" }, type: "array" },
  number: { type: "number" },
  object: { properties: {}, type: "object" },
  password: { format: "password", type: "string" },
  relation: { type: "string" },
  repeater: { items: { properties: {}, type: "object" }, type: "array" },
  richText: { format: "html", type: "string" },
  upload: { description: "Media file ID reference", type: "string" },
  url: { format: "uri", type: "string" },
};

function fieldToOpenApiType(field: FieldDefinition): Record<string, unknown> {
  const nullable = !field.validation?.required;

  if (field.type === "tabs") {
    const tabFields: FieldDefinition[] = (
      (field as { tabs?: Array<{ fields: FieldDefinition[] }> }).tabs ?? []
    ).flatMap((t) => t.fields);
    return { nullable, properties: generateFlatProperties(tabFields), type: "object" };
  }

  if (field.type === "select" || field.type === "radio") {
    const base: Record<string, unknown> = { type: "string" };
    if ("options" in field) {
      base.enum = (field.options as Array<{ value: string }>).map((o) =>
        typeof o === "string" ? o : o.value,
      );
    }
    return addNullable(base, nullable);
  }

  const schema = SIMPLE_OPENAPI_TYPES[field.type] ?? { type: "string" };
  return addNullable({ ...schema }, nullable);
}

function addNullable(schema: Record<string, unknown>, nullable: boolean): Record<string, unknown> {
  if (nullable) {
    schema.nullable = true;
  }
  return schema;
}

function generateFlatProperties(fields: FieldDefinition[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const f of fields) {
    props[f.name] = { ...fieldToOpenApiType(f), description: f.label ?? f.name };
  }
  return props;
}

function generateCollectionSchema(collection: CollectionDefinition): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    id: { description: "Primary key", type: "integer" },
  };

  for (const field of collection.fields) {
    if (field.type === "password") continue;
    properties[field.name] = {
      ...fieldToOpenApiType(field),
      description: field.label ?? field.name,
    };
  }

  if (collection.timestamps !== false && collection.timestamps?.createdAt !== false) {
    properties.createdAt = { format: "date-time", type: "string" };
  }
  if (collection.timestamps !== false && collection.timestamps?.updatedAt !== false) {
    properties.updatedAt = { format: "date-time", type: "string" };
  }

  return {
    properties,
    required: collection.fields.filter((f) => f.validation?.required).map((f) => f.name),
    type: "object",
  };
}

export interface OpenApiOptions {
  title?: string | undefined;
  version?: string | undefined;
  description?: string | undefined;
}

export function generateOpenApiSpec(
  collections: CollectionDefinition[],
  routes: RouteDefinition[],
  options?: OpenApiOptions,
): Record<string, unknown> {
  const schemas: Record<string, unknown> = {};

  for (const collection of collections) {
    const name = pascalCase(collection.slug);
    schemas[`${name}Response`] = generateCollectionSchema(collection);

    const createProps: Record<string, unknown> = {};
    const updateProps: Record<string, unknown> = {};
    for (const field of collection.fields) {
      createProps[field.name] = fieldToOpenApiType(field);
      updateProps[field.name] = { ...fieldToOpenApiType(field), nullable: true };
    }
    schemas[`${name}Create`] = { properties: createProps, type: "object" };
    schemas[`${name}Update`] = { properties: updateProps, type: "object" };
  }

  const paths: Record<string, unknown> = {};

  for (const route of routes) {
    const operation: Record<string, unknown> = {
      operationId: route.operationId,
      responses: {
        "200": { description: "OK" },
        "400": { description: "Bad request" },
        "404": { description: "Not found" },
        "500": { description: "Internal server error" },
      },
      summary: route.summary,
      tags: route.tags,
    };

    if (route.method === "POST") {
      operation.responses = {
        "201": { description: "Created" },
        "400": { description: "Bad request" },
        "500": { description: "Internal server error" },
      };
    }

    if (route.method === "GET" && route.path.endsWith("/:id")) {
      operation.parameters = [
        { in: "path", name: "id", required: true, schema: { type: "string" } },
      ];
    }

    if (route.method === "GET" && !route.path.endsWith("/:id")) {
      operation.parameters = [
        { in: "query", name: "limit", schema: { type: "integer" } },
        { in: "query", name: "offset", schema: { type: "integer" } },
        { in: "query", name: "sort", schema: { type: "string" } },
        { in: "query", name: "select", schema: { type: "string" } },
        { in: "query", name: "populate", schema: { type: "string" } },
      ];
    }

    paths[route.path] = {
      [route.method.toLowerCase()]: operation,
    };
  }

  return {
    components: {
      schemas,
    },
    info: {
      description: options?.description ?? "Auto-generated REST API for CMS collections",
      title: options?.title ?? "Arche CMS API",
      version: options?.version ?? "0.1.0",
    },
    openapi: "3.1.0",
    paths,
  };
}
