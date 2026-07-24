import type { FieldDefinition } from "@arche-cms/types";

import type { Generator, GeneratedFile, GenerationOptions } from "./generator.js";

function toPascal(s: string): string {
  return s.replace(/(^\w|[-_]\w)/g, (c) => c.replace(/[-_]/g, "").toUpperCase());
}

function fieldOptional(field: FieldDefinition): boolean {
  return !field.validation?.required;
}

const fieldTypeMap: Record<string, string> = {
  boolean: "boolean",
  checkbox: "boolean",
  code: "string",
  color: "string",
  date: "string",
  datetime: "string",
  email: "string",
  json: "Record<string, unknown>",
  markdown: "string",
  media: "string",
  multiSelect: "string[]",
  number: "number",
  password: "string",
  radio: "string",
  richText: "unknown",
  select: "string",
  slug: "string",
  text: "string",
  textarea: "string",
  upload: "string",
  url: "string",
};

function fieldToType(field: FieldDefinition): string {
  const mapped = fieldTypeMap[field.type];
  if (mapped) {
    if (field.localized) return `Record<string, ${mapped}>`;
    return mapped;
  }

  let type: string;
  switch (field.type) {
    case "relation":
      type = field.kind === "oneToMany" || field.kind === "manyToMany" ? `string[]` : `string`;
      break;
    case "component":
      type = field.repeatable ? "Record<string, unknown>[]" : "Record<string, unknown>";
      break;
    case "dynamicZone":
      type = "Record<string, unknown>[]";
      break;
    case "array":
      type = `Array<Record<string, unknown>>`;
      break;
    case "object":
    case "group":
      type = `Record<string, unknown>`;
      break;
    case "repeater":
      type = `Array<Record<string, unknown>>`;
      break;
    case "tabs":
      type = `Record<string, unknown>`;
      break;
    default:
      type = "unknown";
  }
  if (field.localized) return `Record<string, ${type}>`;
  return type;
}

function generateInterface(name: string, fields: FieldDefinition[]): string[] {
  const lines: string[] = [];
  lines.push(`export interface ${name} {`);
  lines.push("  id: string;");
  lines.push("  createdAt?: string;");
  lines.push("  updatedAt?: string;");
  for (const f of fields) {
    const opt = fieldOptional(f) ? "?" : "";
    lines.push(`  ${f.name}${opt}: ${fieldToType(f)};`);
  }
  lines.push("}");
  return lines;
}

function generateCollectionHooks(slug: string, name: string): string[] {
  const lines: string[] = [];
  const lower = `use${name}`;
  const key = `${lower}Keys`;

  // Query key factory
  lines.push(`export const ${key} = {`);
  lines.push(`  all: ["${slug}"] as const,`);
  lines.push(`  lists: () => [...${key}.all, "list"] as const,`);
  lines.push(`  list: (params?: ListParams) => [...${key}.lists(), params] as const,`);
  lines.push(`  details: () => [...${key}.all, "detail"] as const,`);
  lines.push(`  detail: (id: string) => [...${key}.details(), id] as const,`);
  lines.push(`  versions: (id: string) => [...${key}.all, "versions", id] as const,`);
  lines.push(`};`);
  lines.push("");

  // list hook
  lines.push(`/** List documents in the "${slug}" collection. */`);
  lines.push(`export function ${lower}List(`);
  lines.push(`  params?: ListParams,`);
  /* eslint-disable no-secrets/no-secrets */
  lines.push(
    `  options?: Omit<UseQueryOptions<PaginatedResponse<${name}>>, "queryKey" | "queryFn">,`,
  );
  /* eslint-enable no-secrets/no-secrets */
  lines.push(`) {`);
  lines.push(`  return useQuery({`);
  lines.push(`    queryKey: ${key}.list(params),`);
  lines.push(`    queryFn: () => client.collection<${name}>("${slug}").list(params),`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  // get hook
  lines.push(`/** Get a single document from the "${slug}" collection by ID. */`);
  lines.push(`export function ${lower}Get(`);
  lines.push(`  id: string,`);
  lines.push(`  options?: Omit<UseQueryOptions<${name}>, "queryKey" | "queryFn">,`);
  lines.push(`) {`);
  lines.push(`  return useQuery({`);
  lines.push(`    queryKey: ${key}.detail(id),`);
  lines.push(`    queryFn: () => client.collection<${name}>("${slug}").get(id),`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  // create hook
  lines.push(`/** Create a new document in the "${slug}" collection. */`);
  lines.push(`export function ${lower}Create(`);
  lines.push(
    `  options?: Omit<UseMutationOptions<${name}, Error, Partial<${name}>>, "mutationFn">,`,
  );
  lines.push(`) {`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);
  lines.push(`    mutationFn: (data: Partial<${name}>) =>`);
  lines.push(`      client.collection<${name}>("${slug}").create(data),`);
  lines.push(`    onSuccess: (...args) => {`);
  lines.push(`      void queryClient.invalidateQueries({ queryKey: ${key}.all });`);
  lines.push(`      options?.onSuccess?.(...args);`);
  lines.push(`    },`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  // update hook
  lines.push(`/** Update an existing document in the "${slug}" collection. */`);
  lines.push(`export function ${lower}Update(`);
  lines.push(
    `  options?: Omit<UseMutationOptions<${name}, Error, { id: string; data: Partial<${name}> }>, "mutationFn">,`,
  );
  lines.push(`) {`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);
  lines.push(`    mutationFn: ({ id, data }: { id: string; data: Partial<${name}> }) =>`);
  lines.push(`      client.collection<${name}>("${slug}").update(id, data),`);
  lines.push(`    onSuccess: (...args) => {`);
  lines.push(`      void queryClient.invalidateQueries({ queryKey: ${key}.all });`);
  lines.push(`      options?.onSuccess?.(...args);`);
  lines.push(`    },`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  // delete hook
  lines.push(`/** Delete a document from the "${slug}" collection. */`);
  lines.push(`export function ${lower}Delete(`);
  lines.push(
    `  options?: Omit<UseMutationOptions<{ message: string }, Error, string>, "mutationFn">,`,
  );
  lines.push(`) {`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);
  lines.push(`    mutationFn: (id: string) =>`);
  lines.push(`      client.collection<${name}>("${slug}").delete(id),`);
  lines.push(`    onSuccess: (...args) => {`);
  lines.push(`      void queryClient.invalidateQueries({ queryKey: ${key}.all });`);
  lines.push(`      options?.onSuccess?.(...args);`);
  lines.push(`    },`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  // bulkDelete hook
  lines.push(`/** Delete multiple documents from the "${slug}" collection. */`);
  lines.push(`export function ${lower}BulkDelete(`);
  lines.push(
    `  options?: Omit<UseMutationOptions<{ deleted: number }, Error, string[]>, "mutationFn">,`,
  );
  lines.push(`) {`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);
  lines.push(`    mutationFn: (ids: string[]) =>`);
  lines.push(`      client.collection<${name}>("${slug}").bulkDelete(ids),`);
  lines.push(`    onSuccess: (...args) => {`);
  lines.push(`      void queryClient.invalidateQueries({ queryKey: ${key}.all });`);
  lines.push(`      options?.onSuccess?.(...args);`);
  lines.push(`    },`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  // publish hook
  lines.push(`/** Publish a draft document in the "${slug}" collection. */`);
  lines.push(`export function ${lower}Publish(`);
  lines.push(`  options?: Omit<UseMutationOptions<${name}, Error, string>, "mutationFn">,`);
  lines.push(`) {`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);
  lines.push(`    mutationFn: (id: string) =>`);
  lines.push(`      client.collection<${name}>("${slug}").publish(id),`);
  lines.push(`    onSuccess: (...args) => {`);
  lines.push(`      void queryClient.invalidateQueries({ queryKey: ${key}.all });`);
  lines.push(`      options?.onSuccess?.(...args);`);
  lines.push(`    },`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  // unpublish hook
  lines.push(`/** Unpublish a document in the "${slug}" collection. */`);
  lines.push(`export function ${lower}Unpublish(`);
  lines.push(`  options?: Omit<UseMutationOptions<${name}, Error, string>, "mutationFn">,`);
  lines.push(`) {`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);
  lines.push(`    mutationFn: (id: string) =>`);
  lines.push(`      client.collection<${name}>("${slug}").unpublish(id),`);
  lines.push(`    onSuccess: (...args) => {`);
  lines.push(`      void queryClient.invalidateQueries({ queryKey: ${key}.all });`);
  lines.push(`      options?.onSuccess?.(...args);`);
  lines.push(`    },`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  // restore hook
  lines.push(`/** Restore a soft-deleted document in the "${slug}" collection. */`);
  lines.push(`export function ${lower}Restore(`);
  lines.push(`  options?: Omit<UseMutationOptions<${name}, Error, string>, "mutationFn">,`);
  lines.push(`) {`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);
  lines.push(`    mutationFn: (id: string) =>`);
  lines.push(`      client.collection<${name}>("${slug}").restore(id),`);
  lines.push(`    onSuccess: (...args) => {`);
  lines.push(`      void queryClient.invalidateQueries({ queryKey: ${key}.all });`);
  lines.push(`      options?.onSuccess?.(...args);`);
  lines.push(`    },`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  return lines;
}

function generateGlobalHooks(slug: string, name: string): string[] {
  const lines: string[] = [];
  const lower = `use${name}`;
  const key = `${lower}Keys`;

  // Query key factory
  lines.push(`export const ${key} = {`);
  lines.push(`  all: ["${slug}"] as const,`);
  lines.push(`  current: () => [...${key}.all, "current"] as const,`);
  lines.push(`};`);
  lines.push("");

  // get hook
  lines.push(`/** Get the "${slug}" global document. */`);
  lines.push(`export function ${lower}Get(`);
  lines.push(`  options?: Omit<UseQueryOptions<${name}Globals>, "queryKey" | "queryFn">,`);
  lines.push(`) {`);
  lines.push(`  return useQuery({`);
  lines.push(`    queryKey: ${key}.current(),`);
  lines.push(`    queryFn: () => client.global<${name}Globals>("${slug}").get(),`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  // upsert hook
  lines.push(`/** Create or update the "${slug}" global document. */`);
  lines.push(`export function ${lower}Upsert(`);
  lines.push(
    `  options?: Omit<UseMutationOptions<${name}Globals, Error, Partial<${name}Globals>>, "mutationFn">,`,
  );
  lines.push(`) {`);
  lines.push(`  const queryClient = useQueryClient();`);
  lines.push(`  return useMutation({`);
  lines.push(`    mutationFn: (data: Partial<${name}Globals>) =>`);
  lines.push(`      client.global<${name}Globals>("${slug}").upsert(data),`);
  lines.push(`    onSuccess: (...args) => {`);
  lines.push(`      void queryClient.invalidateQueries({ queryKey: ${key}.all });`);
  lines.push(`      options?.onSuccess?.(...args);`);
  lines.push(`    },`);
  lines.push(`    ...options,`);
  lines.push(`  });`);
  lines.push(`}`);
  lines.push("");

  return lines;
}

function generateHooksFile(options: GenerationOptions): string {
  const sdkPkg = "@arche-cms/sdk";
  const queryPkg = "@tanstack/react-query";

  const lines: string[] = [
    "// Auto-generated by @arche-cms/generators — do not edit manually",
    "",
    `import { useQuery, useMutation, useQueryClient } from "${queryPkg}";`,
    `import type { UseQueryOptions, UseMutationOptions } from "${queryPkg}";`,
    `import type { ArcheClient, ListParams, PaginatedResponse } from "${sdkPkg}";`,
    "",
  ];

  // Client parameter declaration
  lines.push("let client: ArcheClient;");
  lines.push("");
  lines.push("/**");
  lines.push(" * Initialize the hooks with a configured ArcheClient instance.");
  lines.push(" * Call this once at app root before using any hooks.");
  lines.push(" */");
  lines.push("export function initHooks(archeClient: ArcheClient): void {");
  lines.push("  client = archeClient;");
  lines.push("}");
  lines.push("");

  const collections = options.collections ?? [];
  const globals = options.globals ?? [];

  // Generate interfaces
  for (const col of collections) {
    const name = toPascal(col.slug);
    lines.push(...generateInterface(name, col.fields));
    lines.push("");
  }

  for (const g of globals) {
    const name = toPascal(g.slug);
    lines.push(...generateInterface(`${name}Globals`, g.fields));
    lines.push("");
  }

  // Generate type maps (same as SDK for consistency)
  if (collections.length > 0) {
    lines.push("export interface CollectionTypeMap {");
    for (const col of collections) {
      const name = toPascal(col.slug);
      lines.push(`  "${col.slug}": ${name};`);
    }
    lines.push("}");
    lines.push("");
  }

  if (globals.length > 0) {
    lines.push("export interface GlobalTypeMap {");
    for (const g of globals) {
      const name = toPascal(g.slug);
      lines.push(`  "${g.slug}": ${name}Globals;`);
    }
    lines.push("}");
    lines.push("");
  }

  // Generate collection hooks
  for (const col of collections) {
    const name = toPascal(col.slug);
    lines.push(`// ─── ${col.slug} ──────────────────────────────────────────────`);
    lines.push("");
    lines.push(...generateCollectionHooks(col.slug, name));
  }

  // Generate global hooks
  for (const g of globals) {
    const name = toPascal(g.slug);
    lines.push(`// ─── ${g.slug} ──────────────────────────────────────────────`);
    lines.push("");
    lines.push(...generateGlobalHooks(g.slug, name));
  }

  return lines.join("\n");
}

export const hooksGenerator: Generator = {
  description: "Generates typed React hooks (useQuery/useMutation) for collections and globals",
  async generate(options: GenerationOptions): Promise<GeneratedFile[]> {
    const collections = options.collections ?? [];
    const globals = options.globals ?? [];

    if (collections.length === 0 && globals.length === 0) return [];

    return [
      {
        content: generateHooksFile(options),
        path: "hooks/index.ts",
      },
    ];
  },
  name: "hooks",
};
