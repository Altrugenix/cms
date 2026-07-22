import { createRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { FieldInput } from "@/components/field-input";
import { LocaleSelector } from "@/components/locale-selector";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useCollection, useCreateEntry, useUnsavedChanges } from "@/lib/hooks";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  component: CreateEntry,
  getParentRoute: () => rootRoute,
  path: "/collections/$slug/new",
});

function CreateEntry() {
  const { slug } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { collection, error: loadError, isLoading: loading } = useCollection(slug);
  const createEntry = useCreateEntry(slug);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(loadError ?? null);
  const [locale, setLocale] = useState("en");
  const [initialized, setInitialized] = useState(false);
  const initialValuesRef = useRef<Record<string, unknown>>({});
  const isDirty =
    initialized && JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  const { cancelLeave, confirmLeave, isBlocking } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (initialized || !collection) return;
    const initial: Record<string, unknown> = {};
    for (const f of collection.fields) {
      initial[f.name] = "";
    }
    initialValuesRef.current = initial;
    setValues(initial);
    setInitialized(true);
  }, [collection, initialized]);

  useEffect(() => {
    if (loadError) setError(loadError);
  }, [loadError]);

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
      await createEntry.mutateAsync(payload);
      toast("Entry created", "success");
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
        const msg = err instanceof Error ? err.message : "Failed to create entry";
        setError(msg);
        toast(msg, "error");
      }
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-5" />
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-1 h-5 w-32" />
          </div>
        </div>
        <div className="space-y-6 rounded-lg border p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-4">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>
        </div>
      </div>
    );
  }
  if (error)
    return (
      <div role="alert" className="rounded-md bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  if (!collection) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/collections/$slug"
          params={{ slug }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">New {collection.label}</h1>
          <p className="text-muted-foreground">Create a new entry</p>
        </div>
        <div className="ml-auto">
          <LocaleSelector
            value={locale}
            onChange={setLocale}
            locales={collection.localization?.locales ?? ["en"]}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border p-6">
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
          <Button type="submit" loading={createEntry.isPending}>
            Create
          </Button>
          <Link to="/collections/$slug" params={{ slug }}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      {isBlocking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
          <div className="rounded-lg border bg-card p-6 shadow-lg max-w-md">
            <h3 className="text-lg font-semibold">Unsaved changes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You have unsaved changes. Are you sure you want to leave?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={cancelLeave}>
                Stay
              </Button>
              <Button variant="destructive" onClick={confirmLeave}>
                Leave
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
