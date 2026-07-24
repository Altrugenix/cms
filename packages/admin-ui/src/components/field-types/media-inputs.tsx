import { Upload } from "lucide-react";
import { useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useRelationEntries } from "@/lib/hooks";
import { useProvider } from "@/lib/providers/context";

import type { FieldInputComponentProps } from "./field-helpers";

import { FieldLabel, FieldError } from "./field-helpers";

export function MediaUploadInput({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
  const provider = useProvider();
  const [uploading, setUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isImage = strVal
    ? ["png", "jpg", "jpeg", "gif", "webp", "svg"].some((ext) =>
        strVal.toLowerCase().includes(ext),
      ) || strVal.startsWith("data:image")
    : false;

  const displayUrl = previewUrl ?? (isImage ? strVal : null);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const item = await provider.media.uploadMedia(file);
      onChange(item.id);
      setPreviewUrl(item.url);
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
              <img src={displayUrl} alt="" className="h-12 w-12 rounded object-cover" />
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
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}

export function RelationPicker({
  error,
  field,
  onChange,
  strVal,
}: FieldInputComponentProps & { strVal: string }) {
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
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
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
      <FieldError error={error} inputId={field.name} />
    </div>
  );
}
