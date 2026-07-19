import DOMPurify from "dompurify";
import { Upload, Plus, Trash2, GripVertical } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

import type { FieldDefinition } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadMedia, getMediaUrl, fetchSchema } from "@/lib/api";
import { useRelationEntries } from "@/lib/hooks";

type FieldInputProps = {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
};

export function FieldInput({ error, field, onChange, value }: FieldInputProps) {
  const strVal = typeof value === "string" ? value : value != null ? String(value) : "";

  if (field.type === "media" || field.type === "upload") {
    return <MediaUploadInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "relation" && field.to) {
    return <RelationPicker field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "boolean") {
    return <BooleanInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "checkbox") {
    return <CheckboxInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "select") {
    return <SelectInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "radio") {
    return <RadioInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "multiSelect") {
    return <MultiSelectInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "color") {
    return <ColorInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "component") {
    return <ComponentInput field={field} value={value} onChange={onChange} error={error} />;
  }

  if (field.type === "dynamicZone") {
    return <DynamicZoneInput field={field} value={value} onChange={onChange} error={error} />;
  }

  if (field.type === "array") {
    return <ArrayInput field={field} value={value} onChange={onChange} error={error} />;
  }

  if (field.type === "object" || field.type === "group") {
    return <ObjectInput field={field} value={value} onChange={onChange} error={error} />;
  }

  if (field.type === "repeater") {
    return <RepeaterInput field={field} value={value} onChange={onChange} error={error} />;
  }

  if (field.type === "tabs") {
    return <TabsInput field={field} value={value} onChange={onChange} error={error} />;
  }

  if (field.type === "code") {
    return <CodeInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "json") {
    return <JsonInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "richText") {
    return <RichTextInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "markdown") {
    return <MarkdownInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "textarea") {
    return <TextareaInput field={field} strVal={strVal} onChange={onChange} error={error} />;
  }

  const inputType = mapInputType(field.type);

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Input
        id={field.name}
        type={inputType}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        placeholder={`Enter ${field.label?.toLowerCase() ?? field.name}`}
        className={error ? "border-destructive" : ""}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function mapInputType(fieldType: string): string {
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

function FieldLabel({ field }: { field: FieldDefinition }) {
  return (
    <Label>
      {field.label ?? field.name}
      {field.required && <span className="ml-1 text-destructive">*</span>}
    </Label>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="text-xs text-destructive">{error}</p> : null;
}

/* ─── Boolean ─── */

function BooleanInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          id={field.name}
          type="checkbox"
          checked={strVal === "true" || strVal === "on"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
        />
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      </div>
      <FieldError error={error} />
    </div>
  );
}

/* ─── Checkbox ─── */

function CheckboxInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          id={field.name}
          type="checkbox"
          checked={strVal === "true" || strVal === "on"}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
        />
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      </div>
      <FieldError error={error} />
    </div>
  );
}

/* ─── Select ─── */

function SelectInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const options = getOptions(field);
  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <select
        id={field.name}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <FieldError error={error} />
    </div>
  );
}

/* ─── Radio ─── */

function RadioInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const options = getOptions(field);
  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name={field.name}
              value={opt}
              checked={strVal === opt}
              onChange={(e) => onChange(e.target.value)}
              className="h-4 w-4 border-input text-primary focus:ring-primary"
            />
            {opt}
          </label>
        ))}
      </div>
      <FieldError error={error} />
    </div>
  );
}

/* ─── MultiSelect ─── */

function MultiSelectInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const options = getOptions(field);
  const selected: string[] = strVal
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
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
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
      <FieldError error={error} />
    </div>
  );
}

/* ─── Color ─── */

function ColorInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={strVal || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded border border-input bg-transparent p-0.5"
        />
        <Input
          id={field.name}
          type="text"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className={error ? "border-destructive" : ""}
        />
      </div>
      <FieldError error={error} />
    </div>
  );
}

/* ─── Textarea (plain) ─── */

function TextareaInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <textarea
        id={field.name}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        placeholder={`Enter ${field.label?.toLowerCase() ?? field.name}`}
        rows={4}
        className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
      />
      <FieldError error={error} />
    </div>
  );
}

/* ─── RichText (contentEditable with toolbar) ─── */

function RichTextInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (showLinkPopover) {
      setTimeout(() => linkInputRef.current?.focus(), 0);
    }
  }, [showLinkPopover]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  };

  const onInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const insertLink = () => {
    if (linkUrl.trim()) {
      exec("createLink", linkUrl.trim());
    }
    setShowLinkPopover(false);
    setLinkUrl("");
  };

  if (!isMounted) {
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <textarea
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <FieldError error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <div className="rounded-md border border-input overflow-hidden">
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/50 px-2 py-1.5">
          <ToolbarBtn onClick={() => exec("bold")} title="Bold (Ctrl+B)" label="B" />
          <ToolbarBtn
            onClick={() => exec("italic")}
            title="Italic (Ctrl+I)"
            label="I"
            className="italic"
          />
          <ToolbarBtn
            onClick={() => exec("underline")}
            title="Underline (Ctrl+U)"
            label="U"
            className="underline"
          />
          <ToolbarBtn
            onClick={() => exec("strikeThrough")}
            title="Strikethrough"
            label="S"
            className="line-through"
          />
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarBtn onClick={() => exec("formatBlock", "h1")} title="Heading 1" label="H1" />
          <ToolbarBtn onClick={() => exec("formatBlock", "h2")} title="Heading 2" label="H2" />
          <ToolbarBtn onClick={() => exec("formatBlock", "h3")} title="Heading 3" label="H3" />
          <ToolbarBtn onClick={() => exec("formatBlock", "h4")} title="Heading 4" label="H4" />
          <ToolbarBtn onClick={() => exec("formatBlock", "p")} title="Paragraph" label="P" />
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Bullet list" label="•" />
          <ToolbarBtn onClick={() => exec("insertOrderedList")} title="Numbered list" label="1." />
          <ToolbarBtn
            onClick={() => exec("formatBlock", "blockquote")}
            title="Blockquote"
            label={"\u201C"}
          />
          <ToolbarBtn
            onClick={() => exec("insertHorizontalRule")}
            title="Horizontal rule"
            label="—"
          />
          <span className="mx-1 h-5 w-px bg-border" />
          <div className="relative">
            <ToolbarBtn
              onClick={() => setShowLinkPopover(!showLinkPopover)}
              title="Insert link"
              label="🔗"
            />
            {showLinkPopover && (
              <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border bg-popover p-2 shadow-md">
                <input
                  ref={linkInputRef}
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") insertLink();
                    if (e.key === "Escape") {
                      setShowLinkPopover(false);
                      setLinkUrl("");
                    }
                  }}
                  placeholder="https://example.com"
                  className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="mt-1.5 flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkPopover(false);
                      setLinkUrl("");
                    }}
                    className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={insertLink}
                    className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    Insert
                  </button>
                </div>
              </div>
            )}
          </div>
          <ToolbarBtn onClick={() => exec("unlink")} title="Remove link" label="🔗×" />
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarBtn onClick={() => exec("undo")} title="Undo" label="↩" />
          <ToolbarBtn onClick={() => exec("redo")} title="Redo" label="↪" />
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarBtn onClick={() => exec("removeFormat")} title="Remove formatting" label="×" />
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          onPaste={onPaste}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(strVal) }}
          className="min-h-[200px] w-full bg-background px-3 py-2 text-sm focus-visible:outline-none [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_h4]:text-sm [&_h4]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_hr]:my-4 [&_hr]:border-muted"
        />
      </div>
      <FieldError error={error} />
    </div>
  );
}

function ToolbarBtn({
  className,
  label,
  onClick,
  title,
}: {
  onClick: () => void;
  title: string;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-xs font-medium hover:bg-muted transition-colors ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

/* ─── Markdown (split: edit + preview) ─── */

import { marked } from "marked";

function MarkdownInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    Promise.resolve(marked.parse(strVal ?? "")).then((raw) => {
      setHtml(DOMPurify.sanitize(raw));
    });
  }, [strVal]);

  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <div className="grid grid-cols-2 gap-2">
        <textarea
          id={field.name}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder="Enter markdown..."
          rows={16}
          className={`rounded-md border bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
        />
        <div
          className="overflow-auto rounded-md border border-input bg-background px-3 py-2 text-sm [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-xs [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_img]:max-w-full [&_img]:rounded"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      <FieldError error={error} />
    </div>
  );
}

/* ─── Code (monospace textarea with language badge) ─── */

function CodeInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const language = field.language ?? "text";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel field={field} />
        <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {language}
        </span>
      </div>
      <div className="relative">
        <textarea
          id={field.name}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={`Enter ${language} code...`}
          rows={12}
          spellCheck={false}
          className={`w-full rounded-md border bg-background px-3 py-2 font-mono text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
        />
      </div>
      <FieldError error={error} />
    </div>
  );
}

/* ─── JSON (monospace textarea with validation) ─── */

function JsonInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const [parseError, setParseError] = useState<string | null>(null);

  const handleBlur = () => {
    if (!strVal.trim()) {
      setParseError(null);
      return;
    }
    try {
      JSON.parse(strVal);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof SyntaxError ? e.message : "Invalid JSON");
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(strVal);
      onChange(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch {
      // ignore formatting on invalid JSON
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel field={field} />
        <button
          type="button"
          onClick={formatJson}
          title="Format JSON"
          className="rounded px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Format
        </button>
      </div>
      <textarea
        id={field.name}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        required={field.required}
        placeholder='Enter JSON... (e.g. {"key": "value"})'
        rows={12}
        spellCheck={false}
        className={`w-full rounded-md border bg-background px-3 py-2 font-mono text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          parseError || error ? "border-destructive" : "border-input"
        }`}
      />
      {(parseError || error) && <p className="text-xs text-destructive">{parseError ?? error}</p>}
    </div>
  );
}

/* ─── Media / Upload ─── */

function MediaUploadInput({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const isImage = strVal
    ? ["png", "jpg", "jpeg", "gif", "webp", "svg"].some((ext) =>
        strVal.toLowerCase().includes(ext),
      ) || strVal.startsWith("data:image")
    : false;

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const item = await uploadMedia(file, field.label ?? field.name);
      onChange(item.id);
    } catch {
      // error is handled via the form's error state
    } finally {
      setUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <input
        ref={mediaInputRef}
        type="file"
        id={field.name}
        className="hidden"
        onChange={handleFilePick}
      />
      <div className="flex items-center gap-3 rounded-md border p-3">
        {strVal ? (
          <div className="flex flex-1 items-center gap-3">
            {isImage ? (
              <img src={getMediaUrl(strVal)} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                File
              </div>
            )}
            <span className="flex-1 truncate text-sm">ID: {strVal}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              Clear
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => mediaInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              {uploading ? "Uploading..." : "Choose File"}
            </Button>
          </div>
        )}
      </div>
      <FieldError error={error} />
    </div>
  );
}

/* ─── Relation ─── */

function RelationPicker({
  error,
  field,
  onChange,
  strVal,
}: {
  field: FieldDefinition;
  strVal: string;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const { data: entries = [], isLoading: loading } = useRelationEntries(field.to ?? "");
  const isMulti = field.kind === "oneToMany" || field.kind === "manyToMany";
  const selectedIds: string[] = strVal
    ? strVal
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const toggleEntry = (id: string) => {
    if (isMulti) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id];
      onChange(next.join(", "));
    } else {
      onChange(id);
    }
  };

  const clearSelection = () => onChange("");

  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      {isMulti ? (
        <div className="flex flex-wrap gap-2 rounded-md border border-input p-2">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No entries found</p>
          ) : (
            entries.map((e) => {
              const isSelected = selectedIds.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleEntry(e.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {isSelected ? "✓ " : ""}
                  {e.label}
                </button>
              );
            })
          )}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            id={field.name}
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
          >
            <option value="">{loading ? "Loading..." : "Select..."}</option>
            {entries.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
          {strVal && (
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          )}
        </div>
      )}
      <FieldError error={error} />
    </div>
  );
}

/* ─── Component ─── */

function ComponentInput({
  error,
  field,
  onChange,
  value,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
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
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
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
            <NestedFields
              fields={compFields}
              values={item as Record<string, unknown>}
              onChange={(v) => updateItem(i, v)}
            />
          </div>
        ))}
        <FieldError error={error} />
      </div>
    );
  }

  const objVal = (value as Record<string, unknown>) ?? {};
  return (
    <div className="space-y-2 rounded-md border p-3">
      <FieldLabel field={field} />
      <NestedFields fields={compFields} values={objVal} onChange={(v) => onChange(v)} />
      <FieldError error={error} />
    </div>
  );
}

/* ─── DynamicZone ─── */

function DynamicZoneInput({
  error,
  field,
  onChange,
  value,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
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
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
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
            <NestedFields
              fields={compFields}
              values={item as Record<string, unknown>}
              onChange={(v) => updateItem(i, v)}
            />
          </div>
        );
      })}
      <FieldError error={error} />
    </div>
  );
}

/* ─── Array ─── */

function ArrayInput({
  error,
  field,
  onChange,
  value,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
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
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
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
          <NestedFields
            fields={subFields}
            values={item as Record<string, unknown>}
            onChange={(v) => updateItem(i, v)}
          />
        </div>
      ))}
      <FieldError error={error} />
    </div>
  );
}

/* ─── Object / Group ─── */

function ObjectInput({
  error,
  field,
  onChange,
  value,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const subFields = field.fields ?? [];
  const objVal = (value as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-2 rounded-md border p-3">
      <FieldLabel field={field} />
      <NestedFields fields={subFields} values={objVal} onChange={(v) => onChange(v)} />
      <FieldError error={error} />
    </div>
  );
}

/* ─── Repeater ─── */

function RepeaterInput({
  error,
  field,
  onChange,
  value,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
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
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
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
          <NestedFields
            fields={subFields}
            values={item as Record<string, unknown>}
            onChange={(v) => updateItem(i, v)}
          />
        </div>
      ))}
      <FieldError error={error} />
    </div>
  );
}

/* ─── Tabs ─── */

function TabsInput({
  error,
  field,
  onChange,
  value,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
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
        <NestedFields fields={currentTab.fields} values={objVal} onChange={(v) => onChange(v)} />
      </div>
      <FieldError error={error} />
    </div>
  );
}

/* ─── NestedFields ─── */

function NestedFields({
  fields,
  onChange,
  values,
}: {
  fields: FieldDefinition[];
  values: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-3">
      {fields.map((f) => (
        <FieldInput
          key={f.name}
          field={f}
          value={values[f.name] ?? ""}
          onChange={(val) => onChange({ ...values, [f.name]: val })}
        />
      ))}
    </div>
  );
}

/* ─── Helpers ─── */

function getOptions(field: FieldDefinition): string[] {
  const opts = field.options;
  if (!opts) return [];
  return opts.map((o) => {
    if (typeof o === "string") return o;
    if (o && typeof o === "object" && "value" in o) return String((o as { value: string }).value);
    return String(o);
  });
}
