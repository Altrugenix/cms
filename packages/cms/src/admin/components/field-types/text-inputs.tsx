import DOMPurify from "dompurify";
import { useState } from "react";

import { Input } from "@/components/ui/input";

import type { FieldInputComponentProps } from "./field-helpers";

import { FieldLabel, FieldError, mapInputType } from "./field-helpers";

export function TextareaInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <textarea
        id={field.name}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
        aria-describedby={error ? `${field.name}-error` : undefined}
      />
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function RichTextInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  const [isPreview, setIsPreview] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel field={field} />
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isPreview ? "Edit" : "Preview"}
        </button>
      </div>
      {isPreview ? (
        <div
          className="prose prose-sm dark:prose-invert min-h-[100px] rounded-md border border-input p-3"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(strVal) }}
        />
      ) : (
        <textarea
          id={field.name}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className={`flex w-full rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
          aria-describedby={error ? `${field.name}-error` : undefined}
        />
      )}
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function MarkdownInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  const [isPreview, setIsPreview] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel field={field} />
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isPreview ? "Edit" : "Preview"}
        </button>
      </div>
      {isPreview ? (
        <div
          className="prose prose-sm dark:prose-invert min-h-[100px] rounded-md border border-input p-3"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(strVal) }}
        />
      ) : (
        <textarea
          id={field.name}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className={`flex w-full rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
          aria-describedby={error ? `${field.name}-error` : undefined}
        />
      )}
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function CodeInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <textarea
        id={field.name}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className={`flex w-full rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
        aria-describedby={error ? `${field.name}-error` : undefined}
      />
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function JsonInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleChange = (val: string) => {
    onChange(val);
    if (val.trim()) {
      try {
        JSON.parse(val);
        setJsonError(null);
      } catch {
        setJsonError("Invalid JSON");
      }
    } else {
      setJsonError(null);
    }
  };

  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <textarea
        id={field.name}
        value={strVal}
        onChange={(e) => handleChange(e.target.value)}
        rows={6}
        className={`flex w-full rounded-md border bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error || jsonError ? "border-destructive" : "border-input"}`}
        aria-describedby={error ? `${field.name}-error` : undefined}
        placeholder="{}"
      />
      {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function DefaultTextInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  const inputType = mapInputType(field.type);
  return (
    <div className="space-y-2">
      <label htmlFor={field.name} className="text-sm font-medium leading-none">
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </label>
      <Input
        id={field.name}
        type={inputType}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        placeholder={`Enter ${field.label?.toLowerCase() ?? field.name}`}
        className={error ? "border-destructive" : ""}
        aria-describedby={error ? `${field.name}-error` : undefined}
      />
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}
