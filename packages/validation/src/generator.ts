import type { FieldDefinition, CollectionDefinition, FieldValidation } from "@arche-cms/types";

import { z } from "zod";

function applyValidation<T extends z.ZodType>(
  schema: T,
  validation: FieldValidation | undefined,
): T {
  if (!validation) return schema;

  let result: z.ZodType = schema;

  if (validation.minLength != null && "min" in result) {
    result = (result as unknown as z.ZodString).min(validation.minLength, validation.message);
  }
  if (validation.maxLength != null && "max" in result) {
    result = (result as unknown as z.ZodString).max(validation.maxLength, validation.message);
  }
  if (validation.min != null && "min" in result) {
    result = (result as unknown as z.ZodNumber).min(validation.min, validation.message);
  }
  if (validation.max != null && "max" in result) {
    result = (result as unknown as z.ZodNumber).max(validation.max, validation.message);
  }
  if (validation.pattern && "regex" in result) {
    result = (result as unknown as z.ZodString).regex(
      new RegExp(validation.pattern),
      validation.message,
    );
  }
  if (validation.custom && "refine" in result) {
    result = result.refine(
      validation.custom as (value: unknown) => boolean,
      validation.message ?? "Custom validation failed",
    );
  }

  return result as T;
}

export function fieldToZodSchema(field: FieldDefinition, localize = false): z.ZodType {
  let schema: z.ZodType;

  switch (field.type) {
    case "text":
    case "textarea":
    case "richText":
    case "markdown":
    case "code":
      schema = z.string();
      break;

    case "color":
      if (field.format === "rgb") {
        schema = z.string().regex(/^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/);
      } else if (field.format === "rgba") {
        schema = z.string().regex(/^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0(\.\d+)?|1(\.0)?)\)$/); // eslint-disable-line security/detect-unsafe-regex
      } else if (field.format === "hsl") {
        schema = z.string().regex(/^hsl\(\d{1,3},\s*\d{1,3}%,\s*\d{1,3}%\)$/);
      } else {
        schema = z.string().regex(/^#[0-9a-fA-F]{3,6}$/);
      }
      break;

    case "slug":
      schema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/); // eslint-disable-line security/detect-unsafe-regex
      break;

    case "email":
      schema = z.string().email();
      break;

    case "password":
      schema = z.string().min(8, "Password must be at least 8 characters");
      break;

    case "url":
      schema = z.string().url();
      break;

    case "number":
      schema = z.number();
      break;

    case "boolean":
    case "checkbox":
      schema = z.boolean();
      break;

    case "date":
      schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be ISO 8601 format (YYYY-MM-DD)");
      break;

    case "datetime":
      schema = z.string().datetime({ message: "Datetime must be ISO 8601 format" });
      break;

    case "json":
      schema = z.record(z.string(), z.unknown());
      break;

    case "media":
    case "upload":
      schema = z.string();
      break;

    case "select":
    case "radio":
      if ("options" in field && Array.isArray(field.options)) {
        const values = field.options.map((o) => (typeof o === "string" ? o : o.value)) as [
          string,
          ...string[],
        ];
        schema = values.length > 0 ? z.enum(values) : z.string();
      } else {
        schema = z.string();
      }
      break;

    case "multiSelect":
      schema = z.array(z.string());
      break;

    case "relation":
      schema = z.string();
      break;

    case "component":
      schema = z.record(z.string(), z.unknown());
      break;

    case "dynamicZone":
      schema = z.array(z.record(z.string(), z.unknown()));
      break;

    case "array":
    case "repeater":
      if ("fields" in field) {
        schema = z.array(
          z.object(Object.fromEntries(field.fields.map((f) => [f.name, fieldToZodSchema(f)]))),
        );
      } else {
        schema = z.array(z.record(z.string(), z.unknown()));
      }
      break;

    case "object":
    case "group":
      if ("fields" in field) {
        schema = z.object(
          Object.fromEntries(field.fields.map((f) => [f.name, fieldToZodSchema(f)])),
        );
      } else {
        schema = z.record(z.string(), z.unknown());
      }
      break;

    case "tabs":
      if ("tabs" in field) {
        const tabEntries = field.tabs.flatMap((tab) =>
          tab.fields.map((f) => [f.name, fieldToZodSchema(f)]),
        );
        schema = z.object(Object.fromEntries(tabEntries));
      } else {
        schema = z.record(z.string(), z.unknown());
      }
      break;

    default:
      schema = z.unknown();
  }

  schema = applyValidation(schema, field.validation);

  if (field.localized && localize) {
    schema = z.record(z.string(), schema);
  }

  if (!field.validation?.required) {
    return schema.optional();
  }

  return schema;
}

export function collectionToCreateSchema(
  collection: CollectionDefinition,
): z.ZodObject<Record<string, z.ZodType>> {
  const entries: Record<string, z.ZodType> = {};

  for (const field of collection.fields) {
    if (field.type === "relation") {
      entries[field.name] = z.string().optional();
      continue;
    }
    entries[field.name] = fieldToZodSchema(field, true);
  }

  if (collection.versions?.drafts) {
    entries._status = z.enum(["draft", "published", "archived"]).optional();
  }
  if (collection.versions?.scheduledPublishing) {
    entries._publishAt = z.string().optional();
  }

  return z.object(entries);
}

export function collectionToUpdateSchema(
  collection: CollectionDefinition,
): z.ZodObject<Record<string, z.ZodType>> {
  const entries: Record<string, z.ZodType> = {};

  for (const field of collection.fields) {
    if (field.type === "relation") {
      entries[field.name] = z.string().optional();
      continue;
    }
    entries[field.name] = fieldToZodSchema(field, true).optional();
  }

  if (collection.versions?.drafts) {
    entries._status = z.enum(["draft", "published", "archived"]).optional();
  }
  if (collection.versions?.scheduledPublishing) {
    entries._publishAt = z.string().optional();
  }

  return z.object(entries);
}
