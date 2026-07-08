import { useEffect, useState, type FormEvent } from "react";
import { createRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { fetchCollections, apiFetch, ApiError, type CollectionMeta } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/field-input";
import { ArrowLeft } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections/$slug/new",
  component: CreateEntry,
});

function CreateEntry() {
  const { slug } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collection, setCollection] = useState<CollectionMeta | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCollections()
      .then((cols) => {
        const col = cols.find((c) => c.slug === slug);
        if (!col) throw new Error(`Collection "${slug}" not found`);
        setCollection(col);
        const initial: Record<string, string> = {};
        for (const f of col.fields) {
          initial[f.name] = "";
        }
        setValues(initial);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load collection"))
      .finally(() => setLoading(false));
  }, [slug]);

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
      await apiFetch(`/api/${slug}`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast("Entry created", "success");
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
        const msg = err instanceof Error ? err.message : "Failed to create entry";
        setError(msg);
        toast(msg, "error");
      }
    } finally {
      setSaving(false);
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
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create"}
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
