import { useEffect, useState } from "react";
import { createRoute, Link } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { Skeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { fetchSchemas, deleteSchema, type SchemaInfo } from "@/lib/api";
import { Plus, Pencil, Trash2, FileText, Globe, Puzzle, Layers } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/schemas",
  component: SchemasList,
});

const typeIcons: Record<string, typeof FileText> = {
  collection: FileText,
  global: Globe,
  component: Puzzle,
};

const typeColors: Record<string, string> = {
  collection: "text-blue-500",
  global: "text-emerald-500",
  component: "text-purple-500",
};

function SchemasList() {
  const { toast } = useToast();
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; slug: string } | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchSchemas()
      .then(setSchemas)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load schemas"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteSchema(confirmDelete.type, confirmDelete.slug);
      setSchemas((prev) =>
        prev.filter((s) => !(s.type === confirmDelete.type && s.slug === confirmDelete.slug)),
      );
      setConfirmDelete(null);
      toast("Schema deleted", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast(msg, "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const grouped = {
    collection: schemas.filter((s) => s.type === "collection"),
    global: schemas.filter((s) => s.type === "global"),
    component: schemas.filter((s) => s.type === "component"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Schema Builder</h1>
          <p className="text-muted-foreground">
            {schemas.length} schema{schemas.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link to="/schemas/new">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Schema
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {(["collection", "global", "component"] as const).map((type) => {
        const items = grouped[type];
        const Icon = typeIcons[type] ?? FileText;
        if (items.length === 0) return null;
        return (
          <div key={type}>
            <div className="mb-2 flex items-center gap-2">
              <Icon className={`h-4 w-4 ${typeColors[type]}`} />
              <h2 className="text-sm font-semibold capitalize text-muted-foreground">{type}s</h2>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            <div className="space-y-1">
              {items.map((s) => (
                <div
                  key={`${s.type}-${s.slug}`}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`h-5 w-5 shrink-0 ${typeColors[type]}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.slug} · {s.fields.length} field{s.fields.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link to="/schemas/$type/$slug" params={{ type: s.type, slug: s.slug }}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete({ type: s.type, slug: s.slug })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {schemas.length === 0 && !error && (
        <div className="flex flex-col items-center gap-4 rounded-lg border p-12 text-center">
          <Layers className="h-8 w-8 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No schemas yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first collection, global, or component
          </p>
          <Link to="/schemas/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Schema
            </Button>
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete schema?"
        message="This will delete the schema file. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
