import { createRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, History } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FieldInput } from "@/components/field-input";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { VersionHistoryPanel } from "@/components/version-history-panel";
import { ApiError } from "@/lib/api";
import {
  useCollection,
  useEntry,
  useUpdateEntry,
  usePublishEntry,
  useUnpublishEntry,
} from "@/lib/hooks";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  component: EditEntry,
  getParentRoute: () => rootRoute,
  path: "/collections/$slug/$id",
});

function EditEntry() {
  const { id, slug } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { collection, isLoading: colLoading } = useCollection(slug);
  const [locale, setLocale] = useState("en");
  const { data: entry, error: entryError, isLoading: entryLoading } = useEntry(slug, id, locale);
  const updateEntry = useUpdateEntry(slug);
  const publishEntry = usePublishEntry(slug);
  const unpublishEntry = useUnpublishEntry(slug);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [entryStatus, setEntryStatus] = useState<string>("");
  const [initialized, setInitialized] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  if (collection && entry && !initialized) {
    const initial: Record<string, unknown> = {};
    for (const f of collection.fields) {
      initial[f.name] = entry[f.name] ?? "";
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
      if (f.required) {
        const v = values[f.name];
        if (v === "" || v === undefined || v === null) {
          newErrors[f.name] = `${f.label} is required`;
        }
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const payload: Record<string, unknown> = {};
    for (const f of collection.fields) {
      const v = values[f.name];
      if (v === "" || v === undefined) continue;
      payload[f.name] = f.localized ? { [locale]: v } : v;
    }

    try {
      await updateEntry.mutateAsync({ data: payload, id });
      toast("Entry saved", "success");
      navigate({ params: { slug }, to: "/collections/$slug" });
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
    }
  };

  const handlePublish = async () => {
    try {
      await publishEntry.mutateAsync(id);
      setEntryStatus("published");
      toast("Entry published", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to publish entry", "error");
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishEntry.mutateAsync(id);
      setEntryStatus("draft");
      toast("Entry unpublished", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to unpublish entry", "error");
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
          <Button type="submit" disabled={updateEntry.isPending}>
            {updateEntry.isPending ? "Saving..." : "Save Changes"}
          </Button>
          {collection.versions?.drafts && (
            <>
              {entryStatus === "published" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={unpublishEntry.isPending}
                  onClick={handleUnpublish}
                >
                  {unpublishEntry.isPending ? "Unpublishing..." : "Unpublish"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={publishEntry.isPending}
                  onClick={handlePublish}
                >
                  {publishEntry.isPending ? "Publishing..." : "Publish"}
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

      {collection.versions?.drafts && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowVersions(!showVersions)}
          >
            <History className="h-4 w-4 mr-1" />
            {showVersions ? "Hide" : "Show"} Version History
          </Button>
          {showVersions && (
            <div className="mt-3">
              <VersionHistoryPanel slug={slug} entryId={id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
