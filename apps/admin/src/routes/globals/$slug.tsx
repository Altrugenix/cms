import { useEffect, useState, type FormEvent } from "react";
import { createRoute, Link, useParams } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { fetchGlobals, fetchGlobal, saveGlobal, ApiError, type GlobalMeta } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/field-input";
import { ArrowLeft } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/globals/$slug",
  component: EditGlobal,
});

function EditGlobal() {
  const { slug } = useParams({ from: Route.id });
  const { toast } = useToast();
  const [globalDef, setGlobalDef] = useState<GlobalMeta | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const globals = await fetchGlobals();
        const g = globals.find((g) => g.slug === slug);
        if (!g) throw new Error(`Global "${slug}" not found`);
        if (cancelled) return;
        setGlobalDef(g);

        const initial: Record<string, string> = {};
        for (const f of g.fields) {
          initial[f.name] = "";
        }

        try {
          const existing = await fetchGlobal(slug);
          if (!cancelled) {
            for (const f of g.fields) {
              const val = existing[f.name];
              initial[f.name] = val != null ? String(val) : "";
            }
          }
        } catch {
          // first-time visit — no saved data yet, use defaults
        }

        if (!cancelled) setValues(initial);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load global");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!globalDef) return;

    const newErrors: Record<string, string> = {};
    for (const f of globalDef.fields) {
      if (f.required && !values[f.name]) {
        newErrors[f.name] = `${f.label} is required`;
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      await saveGlobal(slug, values);
      setErrors({});
      toast("Global settings saved", "success");
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const fieldErrors: Record<string, string> = {};
        for (const detail of err.details) {
          const fieldName = String(detail.path[0]);
          if (fieldName) fieldErrors[fieldName] = detail.message;
        }
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      } else {
        const msg = err instanceof Error ? err.message : "Failed to save global";
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
            <Skeleton className="h-10 w-20 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>;
  }

  if (!globalDef) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/globals" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{globalDef.label}</h1>
          <p className="text-muted-foreground">Edit global settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-6">
        {globalDef.fields.map((f) => (
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
            {saving ? "Saving..." : "Save"}
          </Button>
          <Link to="/globals">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
