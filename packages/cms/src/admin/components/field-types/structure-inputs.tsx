import { Plus, Trash2, GripVertical } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { fetchSchema, type FieldDefinition } from "@/lib/api";

import type { FieldInputComponentProps } from "./field-helpers";

import { FieldLabel, FieldError } from "./field-helpers";

export type NestedFieldsRenderer = React.ComponentType<{
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}>;

type StructureInputProps = FieldInputComponentProps & {
  value: unknown;
  renderNested: NestedFieldsRenderer;
};

export function ComponentInput({
  error,
  field,
  onChange,
  renderNested,
  value,
}: StructureInputProps) {
  const [compFields, setCompFields] = useState<FieldDefinition[] | null>(null);

  const schemaSlug = field.component;
  const repeatable = field.repeatable;

  const loadComponent = useCallback(async () => {
    if (!schemaSlug) return;
    try {
      const schema = await fetchSchema("component", schemaSlug);
      setCompFields(schema.fields as FieldDefinition[]);
    } catch {
      setCompFields([]);
    }
  }, [schemaSlug]);

  useEffect(() => {
    loadComponent();
  }, [loadComponent]);

  const Nested = renderNested;

  if (!schemaSlug) {
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <p className="text-xs text-muted-foreground">No component selected</p>
      </div>
    );
  }

  if (!compFields) {
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <p className="text-xs text-muted-foreground">Loading component...</p>
      </div>
    );
  }

  if (repeatable) {
    const items = Array.isArray(value) ? value : [];
    const addItem = () => onChange([...items, {}]);
    const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
    const updateItem = (idx: number, v: unknown) => {
      const next = [...items];
      next[idx] = v;
      onChange(next);
    };

    return (
      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <FieldLabel field={field} />
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
        {items.map((item, i) => (
          <div key={i} className="space-y-2 rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Item {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Nested
              fields={compFields}
              values={item as Record<string, unknown>}
              onChange={(v) => updateItem(i, v)}
            />
          </div>
        ))}
        <FieldError error={error} inputId={field.name} />
      </div>
    );
  }

  const objVal = (value as Record<string, unknown>) ?? {};
  return (
    <div className="space-y-2 rounded-md border p-3">
      <FieldLabel field={field} />
      <Nested fields={compFields} values={objVal} onChange={(v) => onChange(v)} />
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function DynamicZoneInput({
  error,
  field,
  onChange,
  renderNested,
  value,
}: StructureInputProps) {
  const [components, setComponents] = useState<Record<string, FieldDefinition[]>>({});
  const [loading, setLoading] = useState(false);

  const componentSlugs = field.components ?? [];

  const loadComponents = useCallback(async () => {
    if (componentSlugs.length === 0) return;
    setLoading(true);
    const map: Record<string, FieldDefinition[]> = {};
    await Promise.all(
      componentSlugs.map(async (slug) => {
        try {
          const schema = await fetchSchema("component", slug);
          map[slug] = schema.fields as FieldDefinition[];
        } catch {
          map[slug] = [];
        }
      }),
    );
    setComponents(map);
    setLoading(false);
  }, [componentSlugs.join(",")]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  const Nested = renderNested;
  const items = Array.isArray(value) ? value : [];

  const addItem = (compSlug: string) => {
    onChange([...items, { _component: compSlug }]);
  };

  const updateItem = (idx: number, v: unknown) => {
    const next = [...items];
    next[idx] = v;
    onChange(next);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const [selectedComp, setSelectedComp] = useState("");

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <FieldLabel field={field} />
        <div className="flex items-center gap-2">
          <select
            value={selectedComp}
            onChange={(e) => setSelectedComp(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            <option value="">Add component...</option>
            {componentSlugs.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedComp}
            onClick={() => {
              if (selectedComp) {
                addItem(selectedComp);
                setSelectedComp("");
              }
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Loading components...</p>}

      {items.map((item, i) => {
        const compSlug = (item as Record<string, unknown>)._component as string;
        const compFields = components[compSlug] ?? [];
        return (
          <div key={i} className="space-y-2 rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{compSlug}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Nested
              fields={compFields}
              values={item as Record<string, unknown>}
              onChange={(v) => updateItem(i, v)}
            />
          </div>
        );
      })}
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function ArrayInput({ error, field, onChange, renderNested, value }: StructureInputProps) {
  const Nested = renderNested;
  const subFields = field.fields ?? [];
  const items = Array.isArray(value) ? value : [];

  const addItem = () => onChange([...items, {}]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, v: unknown) => {
    const next = [...items];
    next[idx] = v;
    onChange(next);
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <FieldLabel field={field} />
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
        </Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Item {i + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Nested
            fields={subFields}
            values={item as Record<string, unknown>}
            onChange={(v) => updateItem(i, v)}
          />
        </div>
      ))}
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function ObjectInput({ error, field, onChange, renderNested, value }: StructureInputProps) {
  const Nested = renderNested;
  const subFields = field.fields ?? [];
  const objVal = (value as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-2 rounded-md border p-3">
      <FieldLabel field={field} />
      <Nested fields={subFields} values={objVal} onChange={(v) => onChange(v)} />
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function RepeaterInput({
  error,
  field,
  onChange,
  renderNested,
  value,
}: StructureInputProps) {
  const Nested = renderNested;
  const subFields = field.fields ?? [];
  const items = Array.isArray(value) ? value : [];

  const addItem = () => onChange([...items, {}]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, v: unknown) => {
    const next = [...items];
    next[idx] = v;
    onChange(next);
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <FieldLabel field={field} />
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
        </Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Row {i + 1}</span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Nested
            fields={subFields}
            values={item as Record<string, unknown>}
            onChange={(v) => updateItem(i, v)}
          />
        </div>
      ))}
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function TabsInput({ error, field, onChange, renderNested, value }: StructureInputProps) {
  const Nested = renderNested;
  const tabDefs = field.tabs ?? [];
  const [activeTab, setActiveTab] = useState(0);
  const objVal = (value as Record<string, unknown>) ?? {};

  if (tabDefs.length === 0) {
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <p className="text-xs text-muted-foreground">No tabs defined</p>
      </div>
    );
  }

  const currentTab = tabDefs[activeTab];
  if (!currentTab) {
    if (tabDefs.length > 0) setActiveTab(0);
    return null;
  }

  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <div className="flex border-b">
        {tabDefs.map((tab, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              i === activeTab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-2">
        <Nested fields={currentTab.fields} values={objVal} onChange={(v) => onChange(v)} />
      </div>
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}
