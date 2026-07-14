import { useEffect, useState, type FormEvent } from "react";
import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { fetchGlobal, saveGlobal, ApiError, type GlobalMeta } from "@/lib/api";
import { useGlobals } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/field-input";
import { Settings } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const SETTINGS_SLUG = "site-settings";

function SettingsPage() {
  const { toast } = useToast();
  const { globals, isLoading: gLoading, error: gError } = useGlobals();
  const [globalDef, setGlobalDef] = useState<GlobalMeta | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(gError ?? null);

  useEffect(() => {
    if (globals.length === 0) return;
    const g = globals.find((x) => x.slug === SETTINGS_SLUG);
    if (!g) {
      setError("Settings global not found. Create cms/globals/site-settings.ts");
      setLoading(false);
      return;
    }
    setGlobalDef(g);

    let cancelled = false;
    async function load() {
      try {
        const initial: Record<string, unknown> = {};
        for (const f of g.fields) {
          initial[f.name] = "";
        }

        try {
          const existing = await fetchGlobal(SETTINGS_SLUG);
          if (!cancelled) {
            for (const f of g.fields) {
              if (existing[f.name] != null) {
                initial[f.name] = existing[f.name];
              }
            }
          }
        } catch {
          // first visit — use defaults
        }

        if (!cancelled) setValues(initial);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [globals]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!globalDef) return;

    const newErrors: Record<string, string> = {};
    for (const f of globalDef.fields) {
      if (f.required && (values[f.name] === "" || values[f.name] == null)) {
        newErrors[f.name] = `${f.label} is required`;
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      await saveGlobal(SETTINGS_SLUG, values);
      setErrors({});
      toast("Settings saved", "success");
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        const fieldErrors: Record<string, string> = {};
        for (const detail of err.details) {
          const fieldName = String(detail.path[0]);
          if (fieldName) fieldErrors[fieldName] = detail.message;
        }
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      } else {
        const msg = err instanceof Error ? err.message : "Failed to save settings";
        setError(msg);
        toast(msg, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!globalDef || gLoading)
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-1 h-5 w-48" />
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
          </div>
        </div>
      </div>
    );
  if (error)
    return <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>;
  if (!globalDef) return null;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-1 h-5 w-48" />
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
          <p className="text-muted-foreground">Manage site-wide configuration</p>
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
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
