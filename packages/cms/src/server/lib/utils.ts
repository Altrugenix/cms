import type { CollectionDefinition, FieldDefinition, GlobalDefinition } from "@arche-cms/types";

export function normalizeOptions(opts: unknown[]): string[] {
  return opts.map((o) => {
    if (typeof o === "string") return o;
    if (o && typeof o === "object" && "value" in o) return String((o as { value: string }).value);
    return String(o);
  });
}

// fallow-ignore-next-line complexity
function buildFieldMeta(f: FieldDefinition): Record<string, unknown> {
  const base: Record<string, unknown> = {
    label: f.label ?? f.name,
    name: f.name,
    required: f.validation?.required ?? false,
    type: f.type,
  };
  if (f.type === "relation") {
    return { ...base, to: (f as { to?: string }).to ?? /* v8 ignore next */ "" };
  }
  if (f.type === "select" || f.type === "multiSelect" || f.type === "radio") {
    const opts = (f as { options?: unknown[] }).options ?? /* v8 ignore next */ [];
    return { ...base, options: normalizeOptions(opts) };
  }
  return base;
}

export function buildCollectionMeta(
  collections: CollectionDefinition[],
): Record<string, unknown>[] {
  return collections.map((c) => ({
    // fallow-ignore-next-line complexity
    fields: (c.fields ?? /* v8 ignore next */ []).map(buildFieldMeta),
    label: c.labels?.plural ?? /* v8 ignore next */ c.slug,
    labels: c.labels,
    slug: c.slug,
    versions: c.versions,
  }));
}

export function buildGlobalMeta(globals: GlobalDefinition[]): Record<string, unknown>[] {
  return globals.map((g) => ({
    // fallow-ignore-next-line complexity
    fields: (g.fields ?? /* v8 ignore next */ []).map(buildFieldMeta),
    label: g.label,
    slug: g.slug,
  }));
}
