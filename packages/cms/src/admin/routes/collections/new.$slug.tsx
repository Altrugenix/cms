import { createRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { FieldInput } from "@/components/field-input";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useCollection, useCreateEntry } from "@/lib/hooks";
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

  useEffect(() => {
    if (initialized || !collection) return;
    const initial: Record<string, unknown> = {};
    for (const f of collection.fields) {
      initial[f.name] = "";
    }
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
        <div className="space-y-4 rounded-lg border p-6">
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
    return <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>;
  if (!collection) return null;

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
          <h1 className="text-2xl font-bold tracking-tight">New {collection.label}</h1>
          <p className="text-muted-foreground">Create a new entry</p>
        </div>
        <div className="ml-auto">
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
        </div>
      </div>

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
          <Button type="submit" disabled={createEntry.isPending}>
            {createEntry.isPending ? "Creating..." : "Create"}
          </Button>
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
