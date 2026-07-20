import type { CollectionDefinition, FieldDefinition } from "@arche-cms/types";

export interface GraphQLGeneratorConfig {
  maxPageSize?: number | undefined;
  defaultPageSize?: number | undefined;
}

export interface GraphQLSchema {
  typeDefs: string;
  resolvers: Record<string, unknown>;
}

export function pascalCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function camelCase(slug: string): string {
  const p = pascalCase(slug);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

const SCALAR_MAP: Record<string, string> = {
  boolean: "Boolean",
  checkbox: "Boolean",
  code: "String",
  color: "String",
  date: "String",
  datetime: "String",
  email: "String",
  json: "JSON",
  markdown: "String",
  number: "Float",
  password: "String",
  richText: "String",
  slug: "String",
  text: "String",
  textarea: "String",
  url: "String",
};

export function fieldToGraphQLType(
  field: FieldDefinition,
  collections: CollectionDefinition[],
): string {
  const base = baseGraphQLType(field, collections);
  return field.localized ? "JSON" : base;
}

// fallow-ignore-next-line complexity
function baseGraphQLType(field: FieldDefinition, collections: CollectionDefinition[]): string {
  const mapped = SCALAR_MAP[field.type];
  if (mapped) return mapped;

  switch (field.type) {
    case "media":
    case "upload":
      return "String";
    case "select":
    case "radio":
      return "String";
    case "checkbox":
      return "Boolean";
    case "multiSelect":
      return "[String!]";
    case "relation": {
      const target = collections.find((c) => c.slug === field.to);
      return target ? pascalCase(target.slug) : "String";
    }
    case "component": {
      return field.component ? pascalCase(field.component) : "JSON";
    }
    case "dynamicZone":
      return "[JSON!]";
    case "array":
    case "repeater":
      return "[JSON!]";
    case "object":
    case "group":
      return "JSON";
    case "tabs":
      return "JSON";
    default:
      return "String";
  }
}

export function fieldToGraphQLInputType(
  field: FieldDefinition,
  collections: CollectionDefinition[],
): string {
  const gqlType = fieldToGraphQLType(field, collections);
  const required = field.validation?.required ? "!" : "";
  return `${gqlType}${required}`;
}
