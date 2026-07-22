import type { CollectionDefinition, FieldDefinition, GlobalDefinition } from "@arche-cms/types";

import { pascalCase, camelCase, fieldToGraphQLType } from "./types.js";

function fieldToSDL(field: FieldDefinition, collections: CollectionDefinition[]): string {
  const gqlType = fieldToGraphQLType(field, collections);
  const required = field.validation?.required ? "!" : "";
  const description = field.label ? `  "${field.label}"\n` : "";
  return `${description}  ${field.name}: ${gqlType}${required}`;
}

function generateObjectType(
  collection: CollectionDefinition,
  collections: CollectionDefinition[],
): string {
  const fields = (collection.fields ?? /* v8 ignore next */ [])
    .map((f) => fieldToSDL(f, collections))
    .join("\n");
  const timestamps = `
  createdAt: String
  updatedAt: String`;
  return `type ${pascalCase(collection.slug)} {
  id: ID!
${fields}${timestamps}
}`;
}

function generateGlobalType(global: GlobalDefinition, collections: CollectionDefinition[]): string {
  const fields = (global.fields ?? /* v8 ignore next */ [])
    .map((f) => fieldToSDL(f, collections))
    .join("\n");
  return `type ${pascalCase(global.slug)} {
${fields || "  _: Boolean"}
}`;
}

function generateGlobalInput(
  global: GlobalDefinition,
  collections: CollectionDefinition[],
): string {
  const fields = (global.fields ?? /* v8 ignore next */ [])
    .map((f) => {
      const gqlType = fieldToGraphQLType(f, collections);
      return `  ${f.name}: ${gqlType}`;
    })
    .join("\n");
  return `input ${pascalCase(global.slug)}Input {
${fields || "  _: String"}
}`;
}

function generateConnectionType(name: string): string {
  return `type ${name}Connection {
  data: [${name}!]!
  total: Int!
  limit: Int!
  offset: Int!
}`;
}

function generateFilterInput(collection: CollectionDefinition): string {
  const fields = (collection.fields ?? /* v8 ignore next */ [])
    .map((f) => {
      let inputType = "String";
      if (f.type === "number") inputType = "Float";
      else if (f.type === "boolean") inputType = "Boolean";
      else if (f.type === "checkbox") inputType = "Boolean";
      else if (f.type === "date" || f.type === "datetime") inputType = "String";
      else if (f.type === "select" || f.type === "radio") inputType = "String";
      else if (f.type === "multiSelect") inputType = "String";

      return `  ${f.name}: ${inputType}`;
    })
    .join("\n");

  return `input ${pascalCase(collection.slug)}Filter {
${fields || "  _: Boolean"}
}`;
}

function generateSortEnum(collection: CollectionDefinition): string {
  const fields = (collection.fields ?? /* v8 ignore next */ [])
    .map((f) => `  ${f.name}_asc\n  ${f.name}_desc`)
    .join("\n");
  return `enum ${pascalCase(collection.slug)}Sort {
${fields || "  id_asc\n  id_desc"}
}`;
}

function generateCreateInput(
  collection: CollectionDefinition,
  collections: CollectionDefinition[],
): string {
  const fields = (collection.fields ?? /* v8 ignore next */ [])
    .filter((f) => f.type !== "relation")
    .map((f) => {
      const gqlType = fieldToGraphQLType(f, collections);
      const required = f.validation?.required ? "!" : "";
      if (f.type === "component") {
        return `  ${f.name}: JSON${required}`;
      }
      return `  ${f.name}: ${gqlType}${required}`;
    })
    .join("\n");

  return `input ${pascalCase(collection.slug)}CreateInput {
${fields || "  _: String"}
}`;
}

function generateUpdateInput(
  collection: CollectionDefinition,
  collections: CollectionDefinition[],
): string {
  const fields = (collection.fields ?? /* v8 ignore next */ [])
    .filter((f) => f.type !== "relation")
    .map((f) => {
      const gqlType = fieldToGraphQLType(f, collections);
      if (f.type === "component") {
        return `  ${f.name}: JSON`;
      }
      return `  ${f.name}: ${gqlType}`;
    })
    .join("\n");

  return `input ${pascalCase(collection.slug)}UpdateInput {
${fields || "  _: String"}
}`;
}

function collectComponentRefs(collections: CollectionDefinition[]): string[] {
  const slugs = new Set<string>();
  function scan(fields: FieldDefinition[]) {
    for (const f of fields) {
      if (f.type === "component" && (f as { component?: string }).component) {
        slugs.add((f as { component: string }).component);
      }
      if (
        ["array", "object", "group", "repeater"].includes(f.type) &&
        (f as { fields?: FieldDefinition[] }).fields
      ) {
        scan((f as { fields: FieldDefinition[] }).fields);
      }
      if (f.type === "tabs" && (f as { tabs?: Array<{ fields: FieldDefinition[] }> }).tabs) {
        (f as { tabs: Array<{ fields: FieldDefinition[] }> }).tabs.forEach((t) => scan(t.fields));
      }
    }
  }
  for (const c of collections) scan(c.fields);
  return Array.from(slugs);
}

export function generateTypeDefs(
  collections: CollectionDefinition[],
  globals?: GlobalDefinition[],
): string {
  const parts: string[] = [];

  parts.push(`scalar JSON`);

  const componentSlugs = collectComponentRefs(collections);
  for (const slug of componentSlugs) {
    parts.push(`type ${pascalCase(slug)} {\n  _: Boolean\n}`);
  }

  for (const collection of collections) {
    parts.push(generateObjectType(collection, collections));
  }

  for (const collection of collections) {
    parts.push(generateFilterInput(collection));
    parts.push(generateSortEnum(collection));
    parts.push(generateCreateInput(collection, collections));
    parts.push(generateUpdateInput(collection, collections));
  }

  for (const collection of collections) {
    parts.push(generateConnectionType(pascalCase(collection.slug)));
  }

  if (globals) {
    for (const global of globals) {
      parts.push(generateGlobalType(global, collections));
      parts.push(generateGlobalInput(global, collections));
    }
  }

  const queryFields = collections
    .map((c) => {
      const name = pascalCase(c.slug);
      const localeArg = c.localization ? ", locale: String" : "";
      return `  list${name}(filter: ${name}Filter, sort: ${name}Sort, limit: Int, offset: Int${localeArg}): ${name}Connection!
  ${camelCase(c.slug)}(id: ID!${localeArg}): ${name}`;
    })
    .join("\n");

  const globalQueryFields =
    globals?.map((g) => `  ${camelCase(g.slug)}: ${pascalCase(g.slug)}`).join("\n") ?? "";

  const mutationFields = collections
    .map((c) => {
      const name = pascalCase(c.slug);
      return `  create${name}(data: ${name}CreateInput!): ${name}!
  update${name}(id: ID!, data: ${name}UpdateInput!): ${name}!
  delete${name}(id: ID!): Boolean!`;
    })
    .join("\n");

  const globalMutationFields =
    globals
      ?.map(
        (g) =>
          `  update${pascalCase(g.slug)}(data: ${pascalCase(g.slug)}Input!): ${pascalCase(g.slug)}!`,
      )
      .join("\n") ?? "";

  parts.push(`type Query {
${queryFields}${globalQueryFields ? "\n" + globalQueryFields : ""}
}`);

  parts.push(`type Mutation {
${mutationFields}${globalMutationFields ? "\n" + globalMutationFields : ""}
}`);

  return parts.join("\n\n");
}
