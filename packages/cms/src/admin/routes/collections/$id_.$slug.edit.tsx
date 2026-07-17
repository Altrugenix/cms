import { useState, type FormEvent } from "react";
import { createRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { apiFetch, ApiError } from "@/lib/api";
import { useCollection, useEntry } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/field-input";
import { ArrowLeft, CheckCircle } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections/$slug/$id",
  component: EditEntry,
});

function EditEntry() {
  const { slug, id } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { collection, isLoading: colLoading } = useCollection(slug);
  const { data: entry, isLoading: entryLoading, error: entryError } = useEntry(slug, id, locale);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [entryStatus, setEntryStatus] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [locale, setLocale] = useState("en");
  const [initialized, setInitialized] = useState(false);

  if (collection && entry && !initialized) {
    const initial: Record<string, string> = {};
    for (const f of collection.fields) {
      const val = entry[f.name];
      initial[f.name] = typeof val === "string" ? val : val != null ? String(val) : "";
    }
    setValues(initial);
    setEntryStatus((entry._status as string) ?? "");
    setInitialized(true);
  }

  const loading = colLoading || entryLoading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!collection) return;

    const newErrors: Record<string, string> = {};
    for (const f of collection.fields) {
      if (f.required && !values[f.name]) {
        newErrors[f.name] = `${f.label} is required`;
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of collection.fields) {
        const v = values[f.name];
        if (v === "" || v === undefined) continue;
        payload[f.name] = f.localized ? { [locale]: v } : v;
      }
      await apiFetch(`/api/${slug}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast("Entry saved", "success");
      navigate({ to: "/collections/$slug", params: { slug } });
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const fieldErrors: Record<string, string> = {};
        for (const detail of err.details) {
          const fieldName = String(detail.path[0]);
          if (fieldName) fieldErrors[fieldName] = detail.message;
        }
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      } else {
        const msg = err instanceof Error ? err.message : "Failed to update entry";
        setFormError(msg);
        toast(msg, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await apiFetch(`/api/${slug}/${id}/publish`, { method: "POST" });
      setEntryStatus("published");
      toast("Entry published", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to publish entry", "error");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      await apiFetch(`/api/${slug}/${id}/unpublish`, { method: "POST" });
      setEntryStatus("draft");
      toast("Entry unpublished", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to unpublish entry", "error");
    } finally {
      setPublishing(false);
    }
  };

  if (loading)
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-5" />
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-1 h-5 w-32" />
          </div>
        </div>
        <div className="space-y-4 rounded-lg border p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-4">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>
        </div>
      </div>
    );
  if (entryError)
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">{entryError.message}</div>
    );
  if (!collection || !entry) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/collections/$slug"
          params={{ slug }}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit {collection.label}</h1>
          <p className="text-muted-foreground">Editing entry {id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {(collection.localization?.locales ?? ["en"]).map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          {collection.versions?.drafts &&
            entryStatus &&
            (entryStatus === "published" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-4 w-4" /> Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Draft
              </span>
            ))}
        </div>
      </div>

      {formError && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">{formError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-6">
        {collection.fields.map((f) => (
          <FieldInput
            key={f.name}
            field={f}
            value={values[f.name] ?? ""}
            onChange={(val) => setValues((prev) => ({ ...prev, [f.name]: val }))}
            error={errors[f.name]}
          />
        ))}
        <div className="flex items-center gap-2 pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {collection.versions?.drafts && (
            <>
              {entryStatus === "published" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={publishing}
                  onClick={handleUnpublish}
                >
                  {publishing ? "Unpublishing..." : "Unpublish"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={publishing}
                  onClick={handlePublish}
                >
                  {publishing ? "Publishing..." : "Publish"}
                </Button>
              )}
            </>
          )}
          <Link to="/collections/$slug" params={{ slug }}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
