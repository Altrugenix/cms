import { Input } from "@/components/ui/input";

import type { FieldInputComponentProps } from "./field-helpers";

import { FieldLabel, FieldError, getOptions } from "./field-helpers";

export function BooleanInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          id={field.name}
          type="checkbox"
          checked={strVal === "true" || strVal === "on"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          className="h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-describedby={error ? `${field.name}-error` : undefined}
        />
        <label htmlFor={field.name} className="text-sm font-medium leading-none">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </label>
      </div>
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function SelectInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  const options = getOptions(field);
  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <select
        id={field.name}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
        aria-describedby={error ? `${field.name}-error` : undefined}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function RadioInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  const options = getOptions(field);
  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name={field.name}
              value={opt}
              checked={strVal === opt}
              onChange={(e) => onChange(e.target.value)}
              className="h-4 w-4 border-input text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {opt}
          </label>
        ))}
      </div>
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function MultiSelectInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  const options = getOptions(field);
  const selected = strVal
    ? strVal
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange(next.join(", "));
  };

  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {isSelected ? "✓ " : ""}
              {opt}
            </button>
          );
        })}
      </div>
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function ColorInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <div className="flex items-center gap-3">
        <input
          id={field.name}
          type="color"
          value={strVal || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-input"
          aria-describedby={error ? `${field.name}-error` : undefined}
        />
        <Input
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}
