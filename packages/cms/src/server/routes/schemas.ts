import { writeFile, unlink, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { ServerConfig } from "../config.js";
import { SchemaLoader } from "@arche-cms/schema";
import type { FieldDefinition } from "@arche-cms/types";

interface SchemaInfo {
  slug: string;
  label: string;
  type: "collection" | "global" | "component";
  fields: FieldDefinition[];
  meta: Record<string, unknown>;
}

export function registerSchemaRoutes(fastify: FastifyInstance, config: ServerConfig): void {
  const baseDir = resolve(config.schema.baseDir);

  async function loadSchemas(): Promise<SchemaInfo[]> {
    const loader = new SchemaLoader({ baseDir });
    const loaded = await loader.load();
    const result: SchemaInfo[] = [];
    for (const [, def] of loaded.collections) {
      const d = def as unknown as Record<string, unknown>;
      const labels = d.labels as { singular?: string; plural?: string } | undefined;
      result.push({
        slug: def.slug,
        label: labels?.singular ?? def.slug,
        type: "collection",
        fields: def.fields,
        meta: { labels, timestamps: d.timestamps },
      });
    }
    for (const [, def] of loaded.globals) {
      const d = def as unknown as Record<string, unknown>;
      const label = d.label as string | undefined;
      result.push({
        slug: def.slug,
        label: label ?? def.slug,
        type: "global",
        fields: def.fields,
        meta: { label },
      });
    }
    for (const [, def] of loaded.components) {
      const d = def as unknown as Record<string, unknown>;
      const label = d.label as string | undefined;
      result.push({
        slug: def.slug,
        label: label ?? def.slug,
        type: "component",
        fields: def.fields,
        meta: { label },
      });
    }
    return result;
  }

  const errResp = {
    type: "object" as const,
    properties: { error: { type: "string" as const } },
  };

  // GET /api/schemas — list all schemas
  fastify.get(
    "/api/schemas",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "List schemas",
        description: "Returns all collection, global, and component schema definitions",
        tags: ["Schemas"],
        response: { 200: { type: "object", properties: { data: { type: "array" } } } },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const schemas = await loadSchemas();
        return reply.send({ data: schemas });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load schemas";
        return reply.status(500).send({ error: msg });
      }
    },
  );

  // GET /api/schemas/:type/:slug — get a single schema
  fastify.get(
    "/api/schemas/:type/:slug",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Get schema",
        description: "Returns a single schema definition by type and slug",
        tags: ["Schemas"],
        params: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["collection", "global", "component"] },
            slug: { type: "string" },
          },
        },
        response: { 200: { type: "object" }, 404: errResp },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { type, slug } = request.params as { type: string; slug: string };
        const schemas = await loadSchemas();
        const schema = schemas.find((s) => s.type === type && s.slug === slug);
        if (!schema) return reply.status(404).send({ error: "Schema not found" });
        return reply.send(schema);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load schema";
        return reply.status(500).send({ error: msg });
      }
    },
  );

  function validateFields(fields: FieldDefinition[]): string | null {
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f || !f.name || !f.name.trim()) {
        return `Field at index ${i} has an empty name`;
      }
      if (["array", "object", "group", "repeater"].includes(f.type)) {
        const nf = f as { fields?: FieldDefinition[] };
        if (nf.fields) {
          const nested = validateFields(nf.fields);
          if (nested) return `Field "${f.name}": ${nested}`;
        }
      }
      if (f.type === "tabs") {
        const tf = f as { tabs?: Array<{ label: string; fields: FieldDefinition[] }> };
        if (tf.tabs) {
          for (const t of tf.tabs) {
            const nested = validateFields(t.fields);
            if (nested) return `Tab "${t.label}" > ${nested}`;
          }
        }
      }
    }
    return null;
  }

  // helpers for code generation
  const FIELD_HELPER_MAP: Record<string, string> = {
    text: "text",
    textarea: "textarea",
    number: "number",
    boolean: "boolean",
    date: "date",
    datetime: "datetime",
    email: "email",
    password: "password",
    url: "url",
    json: "json",
    richText: "richText",
    markdown: "markdown",
    code: "code",
    color: "color",
    media: "media",
    upload: "upload",
    select: "select",
    multiSelect: "multiSelect",
    radio: "radio",
    checkbox: "checkbox",
    relation: "relation",
    component: "component",
    dynamicZone: "dynamicZone",
    slug: "slug",
    array: "array",
    object: "object",
    group: "group",
    repeater: "repeater",
    tabs: "tabs",
  };

  function serializeValidation(val: Record<string, unknown> | undefined): string {
    if (!val || Object.keys(val).length === 0) return "";
    const entries = Object.entries(val).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "";
    return `{ ${entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")} }`;
  }

  function serializeAdmin(admin: Record<string, unknown> | undefined): string {
    if (!admin || Object.keys(admin).length === 0) return "";
    const entries = Object.entries(admin).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "";
    return `{ ${entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")} }`;
  }

  function serializeCommon(field: Record<string, unknown>): string {
    const pushIf = (parts: string[], cond: unknown, val: string) => {
      if (cond) parts.push(val);
      return parts;
    };
    let parts: string[] = [];
    parts = pushIf(parts, field.label, `label: ${JSON.stringify(field.label)}`);
    parts = pushIf(parts, field.localized, "localized: true");
    parts = pushIf(
      parts,
      field.defaultValue !== undefined,
      `defaultValue: ${JSON.stringify(field.defaultValue)}`,
    );
    const v = serializeValidation(field.validation as Record<string, unknown> | undefined);
    parts = pushIf(parts, v, `validation: ${v}`);
    const a = serializeAdmin(field.admin as Record<string, unknown> | undefined);
    parts = pushIf(parts, a, `admin: ${a}`);
    return parts.join(", ");
  }

  const TYPE_SERIALIZERS: Record<string, (f: FieldDefinition) => string> = {
    relation(f) {
      const rf = f as { to?: string; kind?: string };
      return [
        rf.to && `to: ${JSON.stringify(rf.to)}`,
        rf.kind && `kind: ${JSON.stringify(rf.kind)}`,
      ]
        .filter(Boolean)
        .join(", ");
    },
    component(f) {
      const cf = f as { component?: string; repeatable?: boolean };
      return [
        cf.component && `component: ${JSON.stringify(cf.component)}`,
        cf.repeatable !== undefined && `repeatable: ${String(cf.repeatable)}`,
      ]
        .filter(Boolean)
        .join(", ");
    },
    dynamicZone(f) {
      const df = f as { components?: string[] };
      return df.components ? `components: ${JSON.stringify(df.components)}` : "";
    },
    slug(f) {
      const sf = f as { source?: string; unique?: boolean };
      return [
        sf.source && `source: ${JSON.stringify(sf.source)}`,
        sf.unique !== undefined && `unique: ${String(sf.unique)}`,
      ]
        .filter(Boolean)
        .join(", ");
    },
    code(f) {
      const cf = f as { language?: string };
      return cf.language ? `language: ${JSON.stringify(cf.language)}` : "";
    },
    color(f) {
      const cf = f as { format?: string };
      return cf.format ? `format: ${JSON.stringify(cf.format)}` : "";
    },
    media(f) {
      const mf = f as { multiple?: boolean; allowedTypes?: string[] };
      return [
        mf.multiple !== undefined && `multiple: ${String(mf.multiple)}`,
        mf.allowedTypes && `allowedTypes: ${JSON.stringify(mf.allowedTypes)}`,
      ]
        .filter(Boolean)
        .join(", ");
    },
    upload(f) {
      const mf = f as { multiple?: boolean; allowedTypes?: string[] };
      return [
        mf.multiple !== undefined && `multiple: ${String(mf.multiple)}`,
        mf.allowedTypes && `allowedTypes: ${JSON.stringify(mf.allowedTypes)}`,
      ]
        .filter(Boolean)
        .join(", ");
    },
    array(f) {
      return serializeNested(f);
    },
    object(f) {
      return serializeNested(f);
    },
    group(f) {
      return serializeNested(f);
    },
    repeater(f) {
      return serializeNested(f);
    },
  };

  function serializeNested(f: FieldDefinition): string {
    const nf = f as { fields?: FieldDefinition[] };
    if (!nf.fields || nf.fields.length === 0) return "";
    return `fields: [${nf.fields.map((f) => generateFieldCode(f)).join(", ")}]`;
  }

  function serializeTabs(f: FieldDefinition): string {
    const tf = f as { tabs?: Array<{ label: string; fields: FieldDefinition[] }> };
    if (!tf.tabs || tf.tabs.length === 0) return "";
    const tabsCode = tf.tabs
      .map(
        (t) =>
          `{ label: ${JSON.stringify(t.label)}, fields: [${t.fields.map((f) => generateFieldCode(f)).join(", ")}] }`,
      )
      .join(", ");
    return `tabs: [${tabsCode}]`;
  }

  function serializeSelectOptions(f: FieldDefinition): string {
    const sf = f as { options?: Array<{ label: string; value: string } | string> };
    if (!sf.options || sf.options.length === 0) return "";
    const optsCode = sf.options
      .map((o) => {
        if (typeof o === "string") return JSON.stringify(o);
        return `{ label: ${JSON.stringify(o.label)}, value: ${JSON.stringify(o.value)} }`;
      })
      .join(", ");
    return `options: [${optsCode}]`;
  }

  function serializeFieldOptions(field: FieldDefinition): string {
    const typeSerializer = TYPE_SERIALIZERS[field.type];
    const typePart = typeSerializer ? typeSerializer(field) : "";
    const tabsPart = field.type === "tabs" ? serializeTabs(field) : "";
    const selectPart =
      field.type === "select" || field.type === "multiSelect" || field.type === "radio"
        ? serializeSelectOptions(field)
        : "";

    const allParts = [
      serializeCommon(field as unknown as Record<string, unknown>),
      typePart,
      tabsPart,
      selectPart,
    ]
      .filter(Boolean)
      .join(", ");

    return allParts ? `{ ${allParts} }` : "";
  }

  function generateFieldCode(field: FieldDefinition): string {
    const helper = FIELD_HELPER_MAP[field.type];
    if (!helper) return "";
    const opts = serializeFieldOptions(field);
    if (opts) {
      return `${helper}(${JSON.stringify(field.name)}, ${opts})`;
    }
    return `${helper}(${JSON.stringify(field.name)})`;
  }

  function getUsedHelpers(fields: FieldDefinition[]): Set<string> {
    const helpers = new Set<string>();
    for (const f of fields) {
      const helper = FIELD_HELPER_MAP[f.type];
      if (helper) helpers.add(helper);
      if (["array", "object", "group", "repeater"].includes(f.type)) {
        const nf = f as { fields?: FieldDefinition[] };
        if (nf.fields) {
          const nested = getUsedHelpers(nf.fields);
          nested.forEach((h) => helpers.add(h));
        }
      }
      if (f.type === "tabs") {
        const tf = f as { tabs?: Array<{ label: string; fields: FieldDefinition[] }> };
        if (tf.tabs) {
          for (const t of tf.tabs) {
            const nested = getUsedHelpers(t.fields);
            nested.forEach((h) => helpers.add(h));
          }
        }
      }
    }
    return helpers;
  }

  function generateSchemaCode(
    type: string,
    slug: string,
    fields: FieldDefinition[],
    meta: Record<string, unknown>,
  ): string {
    const helpers = getUsedHelpers(fields);
    const helperList = Array.from(helpers).sort();
    const importStmt = `import { define${type === "global" ? "Global" : type === "component" ? "Component" : "Collection"}${helperList.length > 0 ? ", " + helperList.join(", ") : ""} } from "@arche-cms/schema";`;

    const defineFn =
      type === "global"
        ? "defineGlobal"
        : type === "component"
          ? "defineComponent"
          : "defineCollection";

    const metaProps: string[] = [];
    if (type === "collection") {
      const labels = meta.labels as { singular?: string; plural?: string } | undefined;
      if (labels) {
        metaProps.push(`labels: ${JSON.stringify(labels)}`);
      }
    }
    if (type === "global" && meta.label) {
      metaProps.push(`label: ${JSON.stringify(meta.label)}`);
    }
    if (type === "component" && meta.label) {
      metaProps.push(`label: ${JSON.stringify(meta.label)}`);
    }

    const fieldsCode = fields.map((f) => generateFieldCode(f)).join(",\n    ");
    const fieldsPart = fields.length > 0 ? ` [\n    ${fieldsCode},\n  ]` : ` []`;

    return `${importStmt}\n\nexport default ${defineFn}({\n  slug: ${JSON.stringify(slug)},${metaProps.length > 0 ? `\n  ${metaProps.join(",\n  ")},` : ""}\n  fields:${fieldsPart},\n});\n`;
  }

  // POST /api/schemas/:type — create a new schema
  fastify.post(
    "/api/schemas/:type",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Create schema",
        description: "Create a new collection, global, or component schema as a .ts file on disk",
        tags: ["Schemas"],
        params: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["collection", "global", "component"] },
          },
        },
        body: {
          type: "object",
          required: ["slug"],
          properties: {
            slug: { type: "string" },
            label: { type: "string" },
            fields: { type: "array", items: { type: "object" } },
            meta: { type: "object" },
          },
        },
        response: { 201: { type: "object" }, 400: errResp, 409: errResp },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { type } = request.params as { type: string };
        const body = request.body as {
          slug: string;
          fields?: FieldDefinition[];
          meta?: Record<string, unknown>;
          label?: string;
        };

        if (!body.slug) {
          return reply.status(400).send({ error: "slug is required" });
        }
        if (!["collection", "global", "component"].includes(type)) {
          return reply.status(400).send({ error: "type must be collection, global, or component" });
        }

        const dirMap: Record<string, string> = {
          collection: "collections",
          global: "globals",
          component: "components",
        };
        const dir = dirMap[type];
        if (!dir) {
          return reply.status(400).send({ error: "type must be collection, global, or component" });
        }
        const targetDir = resolve(baseDir, dir);
        if (!existsSync(targetDir)) {
          await mkdir(targetDir, { recursive: true });
        }

        const filePath = resolve(targetDir, `${body.slug}.ts`);
        if (existsSync(filePath)) {
          return reply.status(409).send({ error: `Schema ${body.slug} already exists` });
        }

        const fields = body.fields ?? [];
        const fieldErr = validateFields(fields);
        if (fieldErr) {
          return reply.status(400).send({ error: fieldErr });
        }

        const label = body.label ?? body.slug;
        const meta: Record<string, unknown> = { ...(body.meta ?? {}), label };
        if (type === "collection") {
          meta.labels = meta.labels ?? { singular: label, plural: `${label}s` };
        }

        const code = generateSchemaCode(type, body.slug, fields, meta);
        await writeFile(filePath, code, "utf-8");

        return reply.status(201).send({ message: "Schema created", slug: body.slug, type });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create schema";
        return reply.status(500).send({ error: msg });
      }
    },
  );

  // PUT /api/schemas/:type/:slug — update an existing schema
  fastify.put(
    "/api/schemas/:type/:slug",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Update schema",
        description: "Overwrite an existing schema definition file on disk",
        tags: ["Schemas"],
        params: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["collection", "global", "component"] },
            slug: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            label: { type: "string" },
            fields: { type: "array", items: { type: "object" } },
            meta: { type: "object" },
          },
        },
        response: { 200: { type: "object" }, 400: errResp, 404: errResp },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { type, slug } = request.params as { type: string; slug: string };
        const body = request.body as {
          fields?: FieldDefinition[];
          meta?: Record<string, unknown>;
          label?: string;
        };

        const dirMap: Record<string, string> = {
          collection: "collections",
          global: "globals",
          component: "components",
        };
        const dir = dirMap[type];
        if (!dir) {
          return reply.status(400).send({ error: "type must be collection, global, or component" });
        }
        const filePath = resolve(baseDir, dir, `${slug}.ts`);
        if (!existsSync(filePath)) {
          return reply.status(404).send({ error: "Schema not found" });
        }

        const fields = body.fields ?? [];
        const fieldErr = validateFields(fields);
        if (fieldErr) {
          return reply.status(400).send({ error: fieldErr });
        }

        const label = body.label ?? slug;
        const meta: Record<string, unknown> = { ...(body.meta ?? {}), label };
        if (type === "collection") {
          meta.labels = meta.labels ?? { singular: label, plural: `${label}s` };
        }

        const code = generateSchemaCode(type, slug, fields, meta);
        await writeFile(filePath, code, "utf-8");

        return reply.send({ message: "Schema saved", slug, type });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to save schema";
        return reply.status(500).send({ error: msg });
      }
    },
  );

  // DELETE /api/schemas/:type/:slug — delete a schema file
  fastify.delete(
    "/api/schemas/:type/:slug",
    {
      preHandler: [fastify.authenticate],
      schema: {
        summary: "Delete schema",
        description:
          "Delete a schema definition file from disk (requires manage:schemas permission)",
        tags: ["Schemas"],
        params: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["collection", "global", "component"] },
            slug: { type: "string" },
          },
        },
        response: { 200: { type: "object" }, 400: errResp, 404: errResp },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { type, slug } = request.params as { type: string; slug: string };
        const dirMap: Record<string, string> = {
          collection: "collections",
          global: "globals",
          component: "components",
        };
        const dir = dirMap[type];
        if (!dir) {
          return reply.status(400).send({ error: "type must be collection, global, or component" });
        }
        const filePath = resolve(baseDir, dir, `${slug}.ts`);
        if (!existsSync(filePath)) {
          return reply.status(404).send({ error: "Schema not found" });
        }
        await unlink(filePath);
        return reply.send({ message: "Schema deleted", slug, type });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete schema";
        return reply.status(500).send({ error: msg });
      }
    },
  );
}
