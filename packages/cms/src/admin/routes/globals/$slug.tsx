import { createRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { FieldInput } from "@/components/field-input";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useGlobalSchema, useGlobalData, useSaveGlobal, useUnsavedChanges } from "@/lib/hooks";
import { Route as rootRoute } from "@/routes/__root";

export const Route = createRoute({
  component: EditGlobal,
  getParentRoute: () => rootRoute,
  path: "/globals/$slug",
});

function EditGlobal() {
  const { slug } = useParams({ from: Route.id });
  const { toast } = useToast();
  const { data: globalDef, isLoading: gLoading } = useGlobalSchema(slug);
  const { data: existingData, error: gError, isLoading: dataLoading } = useGlobalData(slug);
  const [initialized, setInitialized] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saveGlobal = useSaveGlobal(slug);
  const initialValuesRef = useRef<Record<string, unknown>>({});
  const isDirty =
    initialized && JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  const { cancelLeave, confirmLeave, isBlocking } = useUnsavedChanges(isDirty);

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
    initialValuesRef.current = initial;
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
        <div className="space-y-6 rounded-lg border p-6">
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
      <div role="alert" className="rounded-md bg-destructive/10 p-4 text-destructive">
        {gError.message}
      </div>
    );
  if (!globalDef)
    return (
      <div role="alert" className="rounded-md bg-destructive/10 p-4 text-destructive">
        Global "{slug}" not found
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/globals"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{globalDef.label}</h1>
          <p className="text-muted-foreground">Edit global settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border p-6">
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
          <Button type="submit" loading={saveGlobal.isPending}>
            Save
          </Button>
          <Link to="/globals">
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
