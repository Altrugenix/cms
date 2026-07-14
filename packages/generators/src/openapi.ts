import type { Generator, GeneratedFile, GenerationOptions } from "./generator.js";
import type { CollectionDefinition } from "@arche-cms/types";

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
      return { type: "array", items: { type: "string" } };
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
      id: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    };

    for (const f of col.fields) {
      properties[f.name] = fieldToSchemaType(f.type);
    }

    schemas[name] = {
      type: "object",
      properties,
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
      get: {
        operationId: `get${name}`,
        responses: { "200": { description: `${name} retrieved` } },
      },
      put: {
        operationId: `update${name}`,
        responses: { "200": { description: `${name} updated` } },
      },
      delete: {
        operationId: `delete${name}`,
        responses: { "200": { description: `${name} deleted` } },
      },
    };
  }

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Arche CMS API",
      version: "0.1.0",
    },
    paths,
    components: { schemas },
  };

  return JSON.stringify(spec, null, 2);
}

export const openApiGenerator: Generator = {
  name: "openapi",
  description: "Generates OpenAPI spec from collection definitions",
  async generate(options: GenerationOptions): Promise<GeneratedFile[]> {
    if (!options.collections || options.collections.length === 0) return [];

    return [
      {
        path: "openapi.json",
        content: generateOpenApiFile(options.collections),
      },
    ];
  },
};
