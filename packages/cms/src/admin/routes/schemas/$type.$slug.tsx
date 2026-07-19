import { createRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Save,
  Eye,
  GripVertical,
  Plus,
  Trash2,
  Copy,
  FileText,
  Type,
  TextQuote,
  Hash,
  ToggleLeft,
  Calendar,
  Clock,
  Mail,
  Lock,
  Link2,
  Braces,
  FileSpreadsheet,
  Code,
  Palette,
  Image,
  Upload,
  ListChecks,
  List,
  Radio,
  CheckSquare,
  GitBranch,
  Layers,
  LayoutDashboard,
  Box,
  Columns,
  FolderOpen,
  Repeat,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";

import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchSchema, type FieldDefinition } from "@/lib/api";
import { useSaveSchema } from "@/lib/hooks";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  component: SchemaEditor,
  getParentRoute: () => rootRoute,
  path: "/schemas/$type/$slug",
});

const FIELD_TYPE_CONFIG: Record<string, { label: string; icon: typeof Type; group: string }> = {
  array: { group: "structure", icon: Box, label: "Array" },
  boolean: { group: "basic", icon: ToggleLeft, label: "Boolean" },
  checkbox: { group: "choice", icon: CheckSquare, label: "Checkbox" },
  code: { group: "advanced", icon: Code, label: "Code" },
  color: { group: "advanced", icon: Palette, label: "Color" },
  component: { group: "structure", icon: Layers, label: "Component" },
  date: { group: "date", icon: Calendar, label: "Date" },
  datetime: { group: "date", icon: Clock, label: "Date Time" },
  dynamicZone: { group: "structure", icon: LayoutDashboard, label: "Dynamic Zone" },
  email: { group: "text", icon: Mail, label: "Email" },
  group: { group: "structure", icon: FolderOpen, label: "Group" },
  json: { group: "advanced", icon: Braces, label: "JSON" },
  markdown: { group: "text", icon: FileSpreadsheet, label: "Markdown" },
  media: { group: "media", icon: Image, label: "Media" },
  multiSelect: { group: "choice", icon: List, label: "Multi Select" },
  number: { group: "basic", icon: Hash, label: "Number" },
  object: { group: "structure", icon: Columns, label: "Object" },
  password: { group: "text", icon: Lock, label: "Password" },
  radio: { group: "choice", icon: Radio, label: "Radio" },
  relation: { group: "advanced", icon: GitBranch, label: "Relation" },
  repeater: { group: "structure", icon: Repeat, label: "Repeater" },
  richText: { group: "text", icon: FileSpreadsheet, label: "Rich Text" },
  select: { group: "choice", icon: ListChecks, label: "Select" },
  slug: { group: "text", icon: LinkIcon, label: "Slug" },
  tabs: { group: "structure", icon: FolderOpen, label: "Tabs" },
  text: { group: "basic", icon: Type, label: "Text" },
  textarea: { group: "basic", icon: TextQuote, label: "Textarea" },
  upload: { group: "media", icon: Upload, label: "Upload" },
  url: { group: "text", icon: Link2, label: "URL" },
};

const FIELD_TYPE_GROUPS = [
  { label: "Basic", value: "basic" },
  { label: "Text", value: "text" },
  { label: "Date", value: "date" },
  { label: "Choice", value: "choice" },
  { label: "Media", value: "media" },
  { label: "Advanced", value: "advanced" },
  { label: "Structure", value: "structure" },
];

function defaultField(type: string): FieldDefinition {
  const base: FieldDefinition = { name: "", type };
  switch (type) {
    case "select":
    case "multiSelect":
    case "radio":
      return { ...base, options: [] };
    case "relation":
      return { ...base, to: "" };
    case "component":
      return { ...base, component: "" };
    case "dynamicZone":
      return { ...base, components: [] };
    case "array":
    case "object":
    case "group":
    case "repeater":
      return { ...base, fields: [] };
    case "tabs":
      return { ...base, tabs: [] };
    default:
      return base;
  }
}

function FieldEditorList({
  fields,
  onChange,
}: {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const updateField = (idx: number, updates: Partial<FieldDefinition>) => {
    onChange(fields.map((f, i) => (i === idx ? ({ ...f, ...updates } as FieldDefinition) : f)));
  };

  const removeField = (idx: number) => {
    onChange(fields.filter((_, i) => i !== idx));
    setSelectedIdx((prev) => (prev === idx ? null : prev));
  };

  const addField = (type: string) => {
    const field = defaultField(type);
    field.name = `field_${fields.length + 1}`;
    onChange([...fields, field]);
    setSelectedIdx(fields.length);
    setShowPicker(false);
  };

  const selectedField = selectedIdx !== null ? fields[selectedIdx] : null;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {fields.map((field, idx) => {
          const cfg = FIELD_TYPE_CONFIG[field.type] ?? {
            group: "basic",
            icon: FileText,
            label: "Text",
          };
          const Icon = cfg.icon;
          return (
            <div
              key={`${field.name}-${idx}`}
              className={`flex cursor-pointer items-center gap-2 rounded border bg-card px-2 py-1.5 text-xs transition-colors ${
                selectedIdx === idx ? "border-primary ring-1 ring-primary" : ""
              } ${dragIdx === idx ? "opacity-50" : ""}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => setSelectedIdx(idx)}
            >
              <div
                className="cursor-grab text-muted-foreground"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-3 w-3" />
              </div>
              <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{field.name || "unnamed"}</span>
              <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px]">{cfg.label}</span>
              <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => {
                    const copy = { ...field, name: `${field.name}_copy` };
                    delete copy.fields;
                    delete copy.tabs;
                    const def = defaultField(field.type);
                    onChange([
                      ...fields.slice(0, idx + 1),
                      { ...def, ...copy },
                      ...fields.slice(idx + 1),
                    ]);
                  }}
                >
                  <Copy className="h-2.5 w-2.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive"
                  onClick={() => removeField(idx)}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {showPicker ? (
        <div className="space-y-2 rounded border bg-card p-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-muted-foreground">Select type</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setShowPicker(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {FIELD_TYPE_GROUPS.map((group) => {
            const types = Object.entries(FIELD_TYPE_CONFIG).filter(
              ([, c]) => c.group === group.value,
            );
            if (types.length === 0) return null;
            return (
              <div key={group.value}>
                <p className="mb-0.5 text-[9px] font-medium uppercase text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {types.map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => addField(key)}
                      className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] transition-colors hover:bg-muted ${
                        newFieldType === key ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <cfg.icon className="h-2.5 w-2.5" />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-full text-xs"
          onClick={() => setShowPicker(true)}
        >
          <Plus className="mr-1 h-3 w-3" /> Add Field
        </Button>
      )}

      {selectedField && (
        <div className="space-y-2 rounded border bg-muted/30 p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Settings</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setSelectedIdx(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <div>
              <Label className="text-[10px]">Name</Label>
              <Input
                value={selectedField.name}
                onChange={(e) => updateField(selectedIdx as number, { name: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px]">Label</Label>
              <Input
                value={selectedField.label ?? ""}
                onChange={(e) =>
                  updateField(selectedIdx as number, { label: e.target.value || undefined })
                }
                placeholder="Label"
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`nested-required-${selectedIdx}`}
              checked={selectedField.validation?.required === true}
              onChange={(e) => {
                const v = {
                  ...(selectedField.validation || {}),
                  required: e.target.checked || undefined,
                };
                updateField(selectedIdx as number, {
                  validation: v.required !== undefined ? v : undefined,
                });
              }}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            <Label htmlFor={`nested-required-${selectedIdx}`} className="text-xs">
              Required
            </Label>
          </div>

          {["select", "multiSelect", "radio"].includes(selectedField.type) && (
            <div className="space-y-1 pt-1 border-t border-border">
              <Label className="text-[10px]">Options</Label>
              <div className="space-y-1">
                {(selectedField.options ?? []).map((opt, oi) => {
                  const display = typeof opt === "string" ? opt : opt.label;
                  return (
                    <div key={oi} className="flex items-center gap-1">
                      <Input
                        value={display}
                        onChange={(e) => {
                          const opts = [...(selectedField.options ?? [])];
                          if (typeof opts[oi] === "string") {
                            opts[oi] = e.target.value;
                          } else {
                            opts[oi] = {
                              ...(opts[oi] as { label: string; value: string }),
                              label: e.target.value,
                              value: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                            };
                          }
                          updateField(selectedIdx as number, { options: opts });
                        }}
                        placeholder="Option label"
                        className="h-7 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-destructive"
                        onClick={() => {
                          const opts = [...(selectedField.options ?? [])];
                          opts.splice(oi, 1);
                          updateField(selectedIdx as number, { options: opts });
                        }}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-full text-xs"
                  onClick={() => {
                    const opts = [...(selectedField.options ?? []), { label: "", value: "" }];
                    updateField(selectedIdx as number, { options: opts });
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add Option
                </Button>
              </div>
            </div>
          )}

          {selectedField.type === "relation" && (
            <div className="space-y-1 pt-1 border-t border-border">
              <Label className="text-[10px]">Related Collection</Label>
              <Input
                value={(selectedField as { to?: string }).to ?? ""}
                onChange={(e) => updateField(selectedIdx as number, { to: e.target.value })}
                placeholder="users"
                className="h-7 text-xs"
              />
              <Label className="text-[10px] mt-1">Kind</Label>
              <select
                value={(selectedField as { kind?: string }).kind ?? "oneToOne"}
                onChange={(e) => updateField(selectedIdx as number, { kind: e.target.value })}
                className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              >
                <option value="oneToOne">One to One</option>
                <option value="oneToMany">One to Many</option>
                <option value="manyToOne">Many to One</option>
                <option value="manyToMany">Many to Many</option>
              </select>
            </div>
          )}

          {selectedField.type === "component" && (
            <div className="space-y-1 pt-1 border-t border-border">
              <Label className="text-[10px]">Component Slug</Label>
              <Input
                value={(selectedField as { component?: string }).component ?? ""}
                onChange={(e) => updateField(selectedIdx as number, { component: e.target.value })}
                placeholder="seo"
                className="h-7 text-xs"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`nested-repeatable-${selectedIdx}`}
                  checked={(selectedField as { repeatable?: boolean }).repeatable === true}
                  onChange={(e) =>
                    updateField(selectedIdx as number, {
                      repeatable: e.target.checked || undefined,
                    })
                  }
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
                <Label htmlFor={`nested-repeatable-${selectedIdx}`} className="text-xs">
                  Repeatable
                </Label>
              </div>
            </div>
          )}

          {selectedField.type === "slug" && (
            <div className="space-y-1 pt-1 border-t border-border">
              <Label className="text-[10px]">Source Field</Label>
              <Input
                value={(selectedField as { source?: string }).source ?? ""}
                onChange={(e) =>
                  updateField(selectedIdx as number, { source: e.target.value || undefined })
                }
                placeholder="title"
                className="h-7 text-xs"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`nested-unique-${selectedIdx}`}
                  checked={(selectedField as { unique?: boolean }).unique === true}
                  onChange={(e) =>
                    updateField(selectedIdx as number, {
                      unique: e.target.checked || undefined,
                    })
                  }
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
                <Label htmlFor={`nested-unique-${selectedIdx}`} className="text-xs">
                  Unique
                </Label>
              </div>
            </div>
          )}

          {selectedField.type === "code" && (
            <div className="space-y-1 pt-1 border-t border-border">
              <Label className="text-[10px]">Language</Label>
              <Input
                value={(selectedField as { language?: string }).language ?? ""}
                onChange={(e) =>
                  updateField(selectedIdx as number, {
                    language: e.target.value || undefined,
                  })
                }
                placeholder="typescript"
                className="h-7 text-xs"
              />
            </div>
          )}

          {selectedField.type === "color" && (
            <div className="space-y-1 pt-1 border-t border-border">
              <Label className="text-[10px]">Format</Label>
              <select
                value={(selectedField as { format?: string }).format ?? "hex"}
                onChange={(e) =>
                  updateField(selectedIdx as number, {
                    format: e.target.value as "hex" | "rgb" | "rgba" | "hsl",
                  })
                }
                className="w-full rounded-md border bg-background px-2 py-1 text-xs"
              >
                <option value="hex">Hex</option>
                <option value="rgb">RGB</option>
                <option value="rgba">RGBA</option>
                <option value="hsl">HSL</option>
              </select>
            </div>
          )}

          {["array", "object", "group", "repeater"].includes(selectedField.type) && (
            <div className="pt-1 border-t border-border">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Nested Fields</p>
              <FieldEditorList
                fields={(selectedField as { fields: FieldDefinition[] }).fields ?? []}
                onChange={(newFields) => updateField(selectedIdx as number, { fields: newFields })}
              />
            </div>
          )}

          {selectedField.type === "tabs" && (
            <div className="pt-1 border-t border-border space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">Tabs</p>
              {(
                (selectedField as { tabs?: Array<{ label: string; fields: FieldDefinition[] }> })
                  .tabs ?? []
              ).map((tab, ti) => (
                <div key={ti} className="rounded border p-1.5 space-y-1">
                  <div className="flex items-center gap-1">
                    <Input
                      value={tab.label}
                      onChange={(e) => {
                        const tabs = [
                          ...((
                            selectedField as {
                              tabs: Array<{ label: string; fields: FieldDefinition[] }>;
                            }
                          ).tabs ?? []),
                        ];
                        tabs[ti] = { ...tabs[ti], label: e.target.value };
                        updateField(selectedIdx as number, { tabs });
                      }}
                      placeholder="Tab label"
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => {
                        const tabs = [
                          ...((
                            selectedField as {
                              tabs: Array<{ label: string; fields: FieldDefinition[] }>;
                            }
                          ).tabs ?? []),
                        ];
                        tabs.splice(ti, 1);
                        updateField(selectedIdx as number, { tabs });
                      }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                  <FieldEditorList
                    fields={tab.fields}
                    onChange={(newFields) => {
                      const tabs = [
                        ...((
                          selectedField as {
                            tabs: Array<{ label: string; fields: FieldDefinition[] }>;
                          }
                        ).tabs ?? []),
                      ];
                      tabs[ti] = { ...tabs[ti], fields: newFields };
                      updateField(selectedIdx as number, { tabs });
                    }}
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-full text-xs"
                onClick={() => {
                  const tabs = [
                    ...((
                      selectedField as { tabs: Array<{ label: string; fields: FieldDefinition[] }> }
                    ).tabs ?? []),
                    { fields: [], label: "New Tab" },
                  ];
                  updateField(selectedIdx as number, { tabs });
                }}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Tab
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SchemaEditor() {
  const { slug, type } = useParams({ from: Route.id });
  const { toast } = useToast();

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [newFieldType, setNewFieldType] = useState("text");
  const saveSchemaMutation = useSaveSchema();
  const [showNewFieldPicker, setShowNewFieldPicker] = useState(false);
  const previewRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSchema(type, slug)
      .then((s) => {
        if (cancelled) return;
        setFields(s.fields);
        setMeta(s.meta);
        setLabel(s.label);
      })
      .catch((err) => {
        if (!cancelled)
          toast(err instanceof Error ? err.message : "Failed to load schema", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, slug, toast]);

  const updateField = (idx: number, updates: Partial<FieldDefinition>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === idx ? ({ ...f, ...updates } as FieldDefinition) : f)),
    );
  };

  const removeField = (idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx((prev) => (prev === idx ? null : prev));
  };

  const addField = (type?: string) => {
    const t = type ?? newFieldType;
    const field = defaultField(t);
    field.name = `field_${fields.length + 1}`;
    setFields((prev) => [...prev, field]);
    setSelectedIdx(fields.length);
    setNewFieldType(t);
    setShowNewFieldPicker(false);
  };

  const duplicateField = (idx: number) => {
    if (!fields[idx]) return;
    const field: FieldDefinition = { ...fields[idx], name: `${fields[idx].name}_copy` };
    setFields((prev) => [...prev.slice(0, idx + 1), field, ...prev.slice(idx + 1)]);
    setSelectedIdx(idx + 1);
  };

  const moveField = useCallback((from: number, to: number) => {
    setFields((prev) => {
      const next = [...prev];
      const moved = next.splice(from, 1)[0];
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return next;
    });
    setSelectedIdx(to);
  }, []);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    moveField(dragIdx, idx);
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  const selectedField = selectedIdx !== null ? fields[selectedIdx] : null;

  const generatePreview = useCallback((): string => {
    const helperNames = new Set<string>();
    const getHelper = (f: FieldDefinition): string => {
      const m: Record<string, string> = {
        array: "array",
        boolean: "boolean",
        checkbox: "checkbox",
        code: "code",
        color: "color",
        component: "component",
        date: "date",
        datetime: "datetime",
        dynamicZone: "dynamicZone",
        email: "email",
        group: "group",
        json: "json",
        markdown: "markdown",
        media: "media",
        multiSelect: "multiSelect",
        number: "number",
        object: "object",
        password: "password",
        radio: "radio",
        relation: "relation",
        repeater: "repeater",
        richText: "richText",
        select: "select",
        slug: "slug",
        tabs: "tabs",
        text: "text",
        textarea: "textarea",
        upload: "upload",
        url: "url",
      };
      const h = m[f.type];
      if (h) helperNames.add(h);
      return h || "text";
    };

    const serOpts = (f: FieldDefinition): string => {
      const parts: string[] = [];
      if (f.label) parts.push(`label: ${JSON.stringify(f.label)}`);
      if (f.localized) parts.push("localized: true");
      if (f.validation && Object.keys(f.validation).length > 0) {
        const v = Object.entries(f.validation)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join(", ");
        if (v) parts.push(`validation: { ${v} }`);
      }
      if (f.type === "relation") {
        if ((f as { to?: string }).to)
          parts.push(`to: ${JSON.stringify((f as { to: string }).to)}`);
        if ((f as { kind?: string }).kind)
          parts.push(`kind: ${JSON.stringify((f as { kind: string }).kind)}`);
      }
      if (f.type === "component") {
        if ((f as { component?: string }).component)
          parts.push(`component: ${JSON.stringify((f as { component: string }).component)}`);
        if ((f as { repeatable?: boolean }).repeatable !== undefined)
          parts.push(`repeatable: ${String((f as { repeatable: boolean }).repeatable)}`);
      }
      if (f.type === "dynamicZone" && (f as { components?: string[] }).components?.length) {
        parts.push(`components: ${JSON.stringify((f as { components: string[] }).components)}`);
      }
      if (
        (f.type === "select" || f.type === "multiSelect" || f.type === "radio") &&
        (f as { options?: unknown[] }).options?.length
      ) {
        const opts = (f as { options: Array<{ label: string; value: string } | string> }).options;
        const code = opts
          .map((o) =>
            typeof o === "string"
              ? JSON.stringify(o)
              : `{ label: ${JSON.stringify(o.label)}, value: ${JSON.stringify(o.value)} }`,
          )
          .join(", ");
        parts.push(`options: [${code}]`);
      }
      if (
        (f.type === "media" || f.type === "upload") &&
        (f as { multiple?: boolean }).multiple !== undefined
      ) {
        parts.push(`multiple: ${String((f as { multiple: boolean }).multiple)}`);
      }
      if (f.type === "slug") {
        if ((f as { source?: string }).source)
          parts.push(`source: ${JSON.stringify((f as { source: string }).source)}`);
        if ((f as { unique?: boolean }).unique !== undefined)
          parts.push(`unique: ${String((f as { unique: boolean }).unique)}`);
      }
      if (f.type === "code" && (f as { language?: string }).language) {
        parts.push(`language: ${JSON.stringify((f as { language: string }).language)}`);
      }
      if (f.type === "color" && (f as { format?: string }).format) {
        parts.push(`format: ${JSON.stringify((f as { format: string }).format)}`);
      }
      // Nested fields
      if (
        ["array", "object", "group", "repeater"].includes(f.type) &&
        (f as { fields?: FieldDefinition[] }).fields?.length
      ) {
        const nf = (f as { fields: FieldDefinition[] }).fields;
        parts.push(`fields: [${nf.map(genField).join(", ")}]`);
      }
      if (
        f.type === "tabs" &&
        (f as { tabs?: Array<{ label: string; fields: FieldDefinition[] }> }).tabs?.length
      ) {
        const tabs = (f as { tabs: Array<{ label: string; fields: FieldDefinition[] }> }).tabs;
        const tc = tabs
          .map(
            (t) =>
              `{ label: ${JSON.stringify(t.label)}, fields: [${t.fields.map(genField).join(", ")}] }`,
          )
          .join(", ");
        parts.push(`tabs: [${tc}]`);
      }
      return parts.length > 0 ? `{ ${parts.join(", ")} }` : "";
    };

    const genField = (f: FieldDefinition): string => {
      const h = getHelper(f);
      const opts = serOpts(f);
      return opts ? `${h}(${JSON.stringify(f.name)}, ${opts})` : `${h}(${JSON.stringify(f.name)})`;
    };

    // Recurse for nested field helpers
    const scan = (f: FieldDefinition) => {
      getHelper(f);
      if (
        ["array", "object", "group", "repeater"].includes(f.type) &&
        (f as { fields?: FieldDefinition[] }).fields
      ) {
        (f as { fields: FieldDefinition[] }).fields.forEach(scan);
      }
      if (
        f.type === "tabs" &&
        (f as { tabs?: Array<{ label: string; fields: FieldDefinition[] }> }).tabs
      ) {
        (f as { tabs: Array<{ label: string; fields: FieldDefinition[] }> }).tabs.forEach((t) =>
          t.fields.forEach(scan),
        );
      }
    };
    fields.forEach(scan);

    const sortedHelpers = Array.from(helperNames).sort();
    const defineFn =
      type === "collection"
        ? "defineCollection"
        : type === "global"
          ? "defineGlobal"
          : "defineComponent";
    const header = `import { ${defineFn}${sortedHelpers.length > 0 ? ", " + sortedHelpers.join(", ") : ""} } from "@arche-cms/schema";\n`;
    const fieldsCode = fields.map((f) => `    ${genField(f)},`).join("\n");

    const metaStr =
      type === "collection"
        ? `\n  labels: ${JSON.stringify((meta.labels as { singular?: string; plural?: string }) ?? { plural: `${label}s`, singular: label })},`
        : `\n  label: ${JSON.stringify(label)},`;

    return `${header}\nexport default ${defineFn}({\n  slug: ${JSON.stringify(slug)},${metaStr}\n  fields: [\n${fieldsCode}\n  ],\n});\n`;
  }, [fields, meta, label, type, slug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSchemaMutation.mutateAsync({ data: { fields, label, meta }, slug, type });
      toast("Schema saved", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-1 h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  const previewCode = generatePreview();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/schemas">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{label}</h1>
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                {type}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {slug} · {fields.length} fields
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? "Editor" : "Preview"}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Field List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">Fields</h2>
            {!showNewFieldPicker ? (
              <Button size="sm" onClick={() => setShowNewFieldPicker(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Field
              </Button>
            ) : null}
          </div>

          {showNewFieldPicker && (
            <div className="rounded-lg border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Select field type</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowNewFieldPicker(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {FIELD_TYPE_GROUPS.map((group) => {
                const types = Object.entries(FIELD_TYPE_CONFIG).filter(
                  ([, c]) => c.group === group.value,
                );
                if (types.length === 0) return null;
                return (
                  <div key={group.value}>
                    <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {types.map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => addField(key)}
                          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted ${newFieldType === key ? "border-primary bg-primary/5" : ""}`}
                        >
                          <cfg.icon className="h-3 w-3" />
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-1.5">
            {fields.map((field, idx) => {
              const cfg = FIELD_TYPE_CONFIG[field.type] ?? {
                group: "basic",
                icon: FileText,
                label: "Text",
              };
              const Icon = cfg.icon;
              const isSelected = selectedIdx === idx;
              const isDragging = dragIdx === idx;
              return (
                <div
                  key={`${field.name}-${idx}`}
                  className={`flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 transition-colors ${
                    isSelected ? "border-primary ring-1 ring-primary" : ""
                  } ${isDragging ? "opacity-50" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <div
                    className="cursor-grab text-muted-foreground"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{field.name || "unnamed"}</p>
                    {field.label && (
                      <p className="truncate text-xs text-muted-foreground">{field.label}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {cfg.label}
                  </span>
                  <div
                    className="flex shrink-0 items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => duplicateField(idx)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeField(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {fields.length === 0 && !showNewFieldPicker && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No fields defined</p>
              <Button size="sm" onClick={() => setShowNewFieldPicker(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add your first field
              </Button>
            </div>
          )}
        </div>

        {/* Right: Settings / Preview */}
        <div className="space-y-3">
          {showPreview ? (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground">Preview</h2>
              <pre
                ref={previewRef}
                className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs leading-relaxed"
              >
                <code>{previewCode}</code>
              </pre>
            </>
          ) : selectedField ? (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground">Field Settings</h2>
              <div className="space-y-4 rounded-lg border bg-card p-4">
                <div className="space-y-2">
                  <Label>Field Name</Label>
                  <Input
                    value={selectedField.name}
                    onChange={(e) => updateField(selectedIdx as number, { name: e.target.value })}
                    placeholder="fieldName"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <select
                    value={selectedField.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const def = defaultField(newType);
                      updateField(selectedIdx as number, {
                        ...def,
                        label: selectedField.label,
                        name: selectedField.name,
                      });
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {FIELD_TYPE_GROUPS.map((g) => (
                      <optgroup key={g.value} label={g.label}>
                        {Object.entries(FIELD_TYPE_CONFIG)
                          .filter(([, c]) => c.group === g.value)
                          .map(([key, cfg]) => (
                            <option key={key} value={key}>
                              {cfg.label}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={selectedField.label ?? ""}
                    onChange={(e) =>
                      updateField(selectedIdx as number, { label: e.target.value || undefined })
                    }
                    placeholder="Human-readable label"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="field-required"
                    checked={selectedField.validation?.required === true}
                    onChange={(e) => {
                      const v = {
                        ...(selectedField.validation || {}),
                        required: e.target.checked || undefined,
                      };
                      updateField(selectedIdx as number, {
                        validation: v.required !== undefined ? v : undefined,
                      });
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="field-required" className="text-sm">
                    Required
                  </Label>
                </div>

                {/* Type-specific settings */}
                {(selectedField.type === "select" ||
                  selectedField.type === "multiSelect" ||
                  selectedField.type === "radio") && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="space-y-1">
                      {(
                        (
                          selectedField as {
                            options?: Array<{ label: string; value: string } | string>;
                          }
                        ).options ?? []
                      ).map((opt, oi) => {
                        const display = typeof opt === "string" ? opt : opt.label;
                        return (
                          <div key={oi} className="flex items-center gap-1">
                            <Input
                              value={display}
                              onChange={(e) => {
                                const opts = [
                                  ...((
                                    selectedField as {
                                      options: Array<{ label: string; value: string } | string>;
                                    }
                                  ).options ?? []),
                                ];
                                if (typeof opts[oi] === "string") {
                                  opts[oi] = e.target.value;
                                } else {
                                  opts[oi] = {
                                    ...(opts[oi] as { label: string; value: string }),
                                    label: e.target.value,
                                    value: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                                  };
                                }
                                updateField(selectedIdx as number, { options: opts });
                              }}
                              placeholder="Option label"
                              className="h-8 text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-destructive"
                              onClick={() => {
                                const opts = [
                                  ...((
                                    selectedField as {
                                      options: Array<{ label: string; value: string } | string>;
                                    }
                                  ).options ?? []),
                                ];
                                opts.splice(oi, 1);
                                updateField(selectedIdx as number, { options: opts });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const opts = [
                            ...((
                              selectedField as {
                                options: Array<{ label: string; value: string } | string>;
                              }
                            ).options ?? []),
                            { label: "", value: "" },
                          ];
                          updateField(selectedIdx as number, { options: opts });
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Option
                      </Button>
                    </div>
                  </div>
                )}

                {selectedField.type === "relation" && (
                  <>
                    <div className="space-y-2">
                      <Label>Related Collection</Label>
                      <Input
                        value={(selectedField as { to?: string }).to ?? ""}
                        onChange={(e) => updateField(selectedIdx as number, { to: e.target.value })}
                        placeholder="users"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relation Kind</Label>
                      <select
                        value={(selectedField as { kind?: string }).kind ?? "oneToOne"}
                        onChange={(e) =>
                          updateField(selectedIdx as number, { kind: e.target.value })
                        }
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="oneToOne">One to One</option>
                        <option value="oneToMany">One to Many</option>
                        <option value="manyToOne">Many to One</option>
                        <option value="manyToMany">Many to Many</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedField.type === "component" && (
                  <>
                    <div className="space-y-2">
                      <Label>Component Slug</Label>
                      <Input
                        value={(selectedField as { component?: string }).component ?? ""}
                        onChange={(e) =>
                          updateField(selectedIdx as number, { component: e.target.value })
                        }
                        placeholder="seo"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="field-repeatable"
                        checked={(selectedField as { repeatable?: boolean }).repeatable === true}
                        onChange={(e) =>
                          updateField(selectedIdx as number, {
                            repeatable: e.target.checked || undefined,
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="field-repeatable" className="text-sm">
                        Repeatable
                      </Label>
                    </div>
                  </>
                )}

                {selectedField.type === "slug" && (
                  <>
                    <div className="space-y-2">
                      <Label>Source Field</Label>
                      <Input
                        value={(selectedField as { source?: string }).source ?? ""}
                        onChange={(e) =>
                          updateField(selectedIdx as number, {
                            source: e.target.value || undefined,
                          })
                        }
                        placeholder="title"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="field-unique"
                        checked={(selectedField as { unique?: boolean }).unique === true}
                        onChange={(e) =>
                          updateField(selectedIdx as number, {
                            unique: e.target.checked || undefined,
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="field-unique" className="text-sm">
                        Unique
                      </Label>
                    </div>
                  </>
                )}

                {selectedField.type === "code" && (
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Input
                      value={(selectedField as { language?: string }).language ?? ""}
                      onChange={(e) =>
                        updateField(selectedIdx as number, {
                          language: e.target.value || undefined,
                        })
                      }
                      placeholder="typescript"
                    />
                  </div>
                )}

                {selectedField.type === "color" && (
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <select
                      value={(selectedField as { format?: string }).format ?? "hex"}
                      onChange={(e) =>
                        updateField(selectedIdx as number, {
                          format: e.target.value as "hex" | "rgb" | "rgba" | "hsl",
                        })
                      }
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="hex">Hex</option>
                      <option value="rgb">RGB</option>
                      <option value="rgba">RGBA</option>
                      <option value="hsl">HSL</option>
                    </select>
                  </div>
                )}

                {(selectedField.type === "media" || selectedField.type === "upload") && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="field-multiple"
                        checked={(selectedField as { multiple?: boolean }).multiple === true}
                        onChange={(e) =>
                          updateField(selectedIdx as number, {
                            multiple: e.target.checked || undefined,
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="field-multiple" className="text-sm">
                        Allow Multiple
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Allowed Types</Label>
                      <div className="flex flex-wrap gap-2">
                        {["image", "video", "audio", "document", "file"].map((t) => {
                          const allowed =
                            (selectedField as { allowedTypes?: string[] }).allowedTypes ?? [];
                          const isSelected = allowed.length === 0 || allowed.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                const current =
                                  (selectedField as { allowedTypes?: string[] }).allowedTypes ?? [];
                                const next = isSelected
                                  ? current.filter((x) => x !== t)
                                  : [...current, t];
                                updateField(selectedIdx as number, {
                                  allowedTypes:
                                    next.length > 0 && next.length < 5 ? next : undefined,
                                });
                              }}
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {selectedField.type === "dynamicZone" && (
                  <div className="space-y-2">
                    <Label>Allowed Components</Label>
                    <div className="space-y-1">
                      {((selectedField as { components?: string[] }).components ?? []).map(
                        (comp, ci) => (
                          <div key={ci} className="flex items-center gap-1">
                            <Input
                              value={comp}
                              onChange={(e) => {
                                const comps = [
                                  ...((selectedField as { components: string[] }).components ?? []),
                                ];
                                comps[ci] = e.target.value;
                                updateField(selectedIdx as number, { components: comps });
                              }}
                              placeholder="component-slug"
                              className="h-8 text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-destructive"
                              onClick={() => {
                                const comps = [
                                  ...((selectedField as { components: string[] }).components ?? []),
                                ];
                                comps.splice(ci, 1);
                                updateField(selectedIdx as number, { components: comps });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ),
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const comps = [
                            ...((selectedField as { components: string[] }).components ?? []),
                            "",
                          ];
                          updateField(selectedIdx as number, { components: comps });
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Component
                      </Button>
                    </div>
                  </div>
                )}

                {["array", "object", "group", "repeater"].includes(selectedField.type) && (
                  <div className="space-y-2">
                    <Label>Nested Fields</Label>
                    <div className="rounded-md border bg-muted/20 p-3">
                      <FieldEditorList
                        fields={(selectedField as { fields: FieldDefinition[] }).fields ?? []}
                        onChange={(newFields) =>
                          updateField(selectedIdx as number, { fields: newFields })
                        }
                      />
                    </div>
                  </div>
                )}

                {selectedField.type === "tabs" && (
                  <div className="space-y-2">
                    <Label>Tabs</Label>
                    <div className="space-y-2">
                      {(
                        (
                          selectedField as {
                            tabs?: Array<{ label: string; fields: FieldDefinition[] }>;
                          }
                        ).tabs ?? []
                      ).map((tab, ti) => (
                        <div key={ti} className="space-y-2 rounded-md border p-3">
                          <div className="flex items-center gap-2">
                            <Input
                              value={tab.label}
                              onChange={(e) => {
                                const tabs = [
                                  ...((
                                    selectedField as {
                                      tabs: Array<{ label: string; fields: FieldDefinition[] }>;
                                    }
                                  ).tabs ?? []),
                                ];
                                tabs[ti] = { ...tabs[ti], label: e.target.value };
                                updateField(selectedIdx as number, { tabs });
                              }}
                              placeholder="Tab label"
                              className="h-8 text-xs flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-destructive"
                              onClick={() => {
                                const tabs = [
                                  ...((
                                    selectedField as {
                                      tabs: Array<{ label: string; fields: FieldDefinition[] }>;
                                    }
                                  ).tabs ?? []),
                                ];
                                tabs.splice(ti, 1);
                                updateField(selectedIdx as number, { tabs });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="pl-2 border-l-2 border-muted">
                            <FieldEditorList
                              fields={tab.fields}
                              onChange={(newFields) => {
                                const tabs = [
                                  ...((
                                    selectedField as {
                                      tabs: Array<{ label: string; fields: FieldDefinition[] }>;
                                    }
                                  ).tabs ?? []),
                                ];
                                tabs[ti] = { ...tabs[ti], fields: newFields };
                                updateField(selectedIdx as number, { tabs });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const tabs = [
                            ...((
                              selectedField as {
                                tabs: Array<{ label: string; fields: FieldDefinition[] }>;
                              }
                            ).tabs ?? []),
                            { fields: [], label: "New Tab" },
                          ];
                          updateField(selectedIdx as number, { tabs });
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Tab
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeField(selectedIdx as number)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove Field
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
              <p className="text-sm text-muted-foreground">Select a field to edit its settings</p>
              <p className="text-xs text-muted-foreground">
                Or click Preview to see the generated schema
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
