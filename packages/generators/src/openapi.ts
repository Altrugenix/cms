import type { CollectionDefinition } from "@arche-cms/types";

import type { Generator, GeneratedFile, GenerationOptions } from "./generator.js";

function toPascal(s: string): string {
  return s.replace(/(^\w|[-_]\w)/g, (c) => c.replace(/[-_]/g, "").toUpperCase());
}

function fieldToSchemaType(type: string): Record<string, unknown> {
  switch (type) {
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "json":
      return { type: "object" };
    case "richText":
      return { type: "object" };
    case "multiSelect":
      return { items: { type: "string" }, type: "array" };
    default:
      return { type: "string" };
  }
}

function generateOpenApiFile(collections: CollectionDefinition[]): string {
  const paths: Record<string, unknown> = {};
  const schemas: Record<string, unknown> = {};

  for (const col of collections) {
    const name = toPascal(col.slug);

    const properties: Record<string, Record<string, unknown>> = {
      createdAt: { format: "date-time", type: "string" },
      id: { type: "string" },
      updatedAt: { format: "date-time", type: "string" },
    };

    for (const f of col.fields) {
      properties[f.name] = fieldToSchemaType(f.type);
    }

    schemas[name] = {
      properties,
      type: "object",
    };

    const basePath = `/api/collections/${col.slug}`;
    paths[basePath] = {
      get: {
        operationId: `list${name}`,
        responses: { "200": { description: `List of ${name}` } },
      },
      post: {
        operationId: `create${name}`,
        responses: { "201": { description: `${name} created` } },
      },
    };
    paths[`${basePath}/{id}`] = {
      delete: {
        operationId: `delete${name}`,
        responses: { "200": { description: `${name} deleted` } },
      },
      get: {
        operationId: `get${name}`,
        responses: { "200": { description: `${name} retrieved` } },
      },
      put: {
        operationId: `update${name}`,
        responses: { "200": { description: `${name} updated` } },
      },
    };
  }

  const spec = {
    components: { schemas },
    info: {
      title: "Arche CMS API",
      version: "0.1.0",
    },
    openapi: "3.1.0",
    paths,
  };

  return JSON.stringify(spec, null, 2);
}

export const openApiGenerator: Generator = {
  description: "Generates OpenAPI spec from collection definitions",
  async generate(options: GenerationOptions): Promise<GeneratedFile[]> {
    if (!options.collections || options.collections.length === 0) return [];

    return [
      {
        content: generateOpenApiFile(options.collections),
        path: "openapi.json",
      },
    ];
  },
  name: "openapi",
};
