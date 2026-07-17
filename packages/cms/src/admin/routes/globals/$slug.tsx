import { useState, type FormEvent } from "react";
import { createRoute, Link, useParams } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast-provider";
import { ApiError } from "@/lib/api";
import { useGlobal, useGlobalData, useSaveGlobal } from "@/lib/hooks";
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
  const { global: globalDef, isLoading: gLoading } = useGlobal(slug);
  const { data: existingData, isLoading: dataLoading, error: gError } = useGlobalData(slug);
  const [initialized, setInitialized] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saveGlobal = useSaveGlobal(slug);

  const loading = gLoading || dataLoading;

  if (globalDef && !initialized) {
    const initial: Record<string, unknown> = {};
    for (const f of globalDef.fields) {
      if (existingData && existingData[f.name] != null) {
        initial[f.name] = existingData[f.name];
      } else {
        initial[f.name] = "";
      }
    }
    setValues(initial);
    setInitialized(true);
  }

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

    try {
      await saveGlobal.mutateAsync(values);
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
        toast(msg, "error");
      }
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
            <Skeleton className="h-10 w-20 rounded-md" />
            <Skeleton className="h-10 w-20 rounded-md" />
          </div>
        </div>
      </div>
    );
  if (gError)
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">{gError.message}</div>
    );
  if (!globalDef)
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive">
        Global "{slug}" not found
      </div>
    );

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
          <Button type="submit" disabled={saveGlobal.isPending}>
            {saveGlobal.isPending ? "Saving..." : "Save"}
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
