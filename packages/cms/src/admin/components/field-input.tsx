import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { uploadMedia, getMediaUrl, apiFetch } from "@/lib/api";

type FieldDef = {
  name: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
  to?: string;
};

type FieldInputProps = {
  field: FieldDef;
  value: unknown;
  onChange: (value: string) => void;
  error?: string;
};

export function FieldInput({ field, value, onChange, error }: FieldInputProps) {
  const strVal = typeof value === "string" ? value : value != null ? String(value) : "";
  const [uploading, setUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  if (field.type === "media" || field.type === "upload") {
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
        const item = await uploadMedia(file, field.label);
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
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
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
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (field.type === "relation" && field.to) {
    return <RelationPicker field={field} value={strVal} onChange={onChange} error={error} />;
  }

  if (field.type === "boolean") {
    return (
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
    );
  }

  if (field.type === "select" || field.type === "radio") {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        <select
          id={field.name}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
        >
          <option value="">Select...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  if (
    field.type === "textarea" ||
    field.type === "markdown" ||
    field.type === "code" ||
    field.type === "json" ||
    field.type === "richText"
  ) {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.name}>
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        <textarea
          id={field.name}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          rows={field.type === "richText" || field.type === "code" ? 12 : 4}
          className={`flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-destructive" : "border-input"}`}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  const inputType = mapFieldType(field.type);

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
        placeholder={`Enter ${field.label.toLowerCase()}`}
        className={error ? "border-destructive" : ""}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RelationPicker({
  field,
  value,
  onChange,
  error,
}: {
  field: FieldDef;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}) {
  const [entries, setEntries] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<{ data: Array<Record<string, unknown>> }>(`/api/${field.to}`);
        if (cancelled) return;
        setEntries(
          data.data.map((e) => ({
            id: String(e.id),
            label: (e.title ?? e.name ?? e.id) as string,
          })),
        );
      } catch {
        // silently fail — dropdown will just be empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [field.to]);

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        <select
          id={field.name}
          value={value}
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
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            Clear
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function mapFieldType(fieldType: string): string {
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
