import type { CollectionDefinition, FieldDefinition } from "@arche-cms/types";
import type { RouteDefinition } from "./types.js";

function pascalCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function fieldToOpenApiType(field: FieldDefinition): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  const nullable = !field.validation?.required;

  switch (field.type) {
    case "number":
      base.type = "number";
      break;
    case "boolean":
      base.type = "boolean";
      break;
    case "json":
      base.type = "object";
      break;
    case "select":
      base.type = "string";
      if ("options" in field) {
        base.enum = (field.options as Array<{ value: string }>).map((o) => o.value);
      }
      break;
    case "multiSelect":
      base.type = "array";
      base.items = { type: "string" };
      break;
    case "relation":
      base.type = "string";
      break;
    case "checkbox":
      base.type = "boolean";
      break;
    case "date":
    case "datetime":
      base.type = "string";
      base.format = "date-time";
      break;
    default:
      base.type = "string";
  }

  if (base.type !== "array") {
    base.type ??= "string";
  }

  if (nullable && base.type !== "array") {
    base.nullable = true;
  }

  return base;
}

function generateCollectionSchema(collection: CollectionDefinition): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    id: { type: "integer", description: "Primary key" },
  };

  for (const field of collection.fields) {
    properties[field.name] = {
      ...fieldToOpenApiType(field),
      description: field.label ?? field.name,
    };
  }

  if (collection.timestamps?.createdAt !== false) {
    properties.createdAt = { type: "string", format: "date-time" };
  }
  if (collection.timestamps?.updatedAt !== false) {
    properties.updatedAt = { type: "string", format: "date-time" };
  }

  return {
    type: "object",
    properties,
    required: collection.fields.filter((f) => f.validation?.required).map((f) => f.name),
  };
}

export interface OpenApiOptions {
  title?: string;
  version?: string;
  description?: string;
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
    schemas[`${name}Create`] = { type: "object", properties: createProps };
    schemas[`${name}Update`] = { type: "object", properties: updateProps };
  }

  const paths: Record<string, unknown> = {};

  for (const route of routes) {
    const operation: Record<string, unknown> = {
      operationId: route.operationId,
      summary: route.summary,
      tags: route.tags,
      responses: {
        "200": { description: "OK" },
        "400": { description: "Bad request" },
        "404": { description: "Not found" },
        "500": { description: "Internal server error" },
      },
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
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ];
    }

    if (route.method === "GET" && !route.path.endsWith("/:id")) {
      operation.parameters = [
        { name: "limit", in: "query", schema: { type: "integer" } },
        { name: "offset", in: "query", schema: { type: "integer" } },
        { name: "sort", in: "query", schema: { type: "string" } },
        { name: "select", in: "query", schema: { type: "string" } },
        { name: "populate", in: "query", schema: { type: "string" } },
      ];
    }

    paths[route.path] = {
      [route.method.toLowerCase()]: operation,
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: options?.title ?? "Arche CMS API",
      version: options?.version ?? "0.1.0",
      description: options?.description ?? "Auto-generated REST API for CMS collections",
    },
    paths,
    components: {
      schemas,
    },
  };
}
