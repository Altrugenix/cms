import type { FieldDefinition } from "@/lib/api";

import { Label } from "@/components/ui/label";

export function FieldLabel({ field }: { field: FieldDefinition }) {
  return (
    <Label htmlFor={field.name} aria-required={field.required || undefined}>
      {field.label ?? field.name}
      {field.required && <span className="ml-1 text-destructive">*</span>}
    </Label>
  );
}

export function FieldError({ error, inputId }: { error?: string; inputId?: string }) {
  if (!error) return null;
  const errorId = inputId ? `${inputId}-error` : undefined;
  return (
    <p id={errorId} role="alert" className="text-xs text-destructive">
      {error}
    </p>
  );
}

export function mapInputType(fieldType: string): string {
  switch (fieldType) {
    case "email":
      return "email";
    case "number":
      return "number";
    case "password":
      return "password";
    case "url":
      return "url";
    case "date":
      return "date";
    case "datetime":
      return "datetime-local";
    default:
      return "text";
  }
}

export function getOptions(field: FieldDefinition): string[] {
  const opts = field.options;
  if (!opts) return [];
  return opts.map((o) => {
    if (typeof o === "string") return o;
    if (o && typeof o === "object" && "value" in o) return String((o as { value: string }).value);
    return String(o);
  });
}

export type FieldInputComponentProps = {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
};
